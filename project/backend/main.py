"""
FastAPI: API REST + servido del frontend compilado (un solo servicio, un solo puerto).

Endpoints bajo /api/*. Todo lo demás se sirve desde el frontend estático (React+Vite build).
"""
import os
from typing import List, Optional

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

import agents
import msg_import
import service
import storage
from store import STORE, seed, paso_actual

app = FastAPI(title="Garra IA · Validación de Comunicaciones", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# Sembramos los datos de demo al importar el módulo (determinista, no depende del
# evento de arranque ni del modo de ejecución).
seed()


# ---------------------------------------------------------------------------
# Modelos de request
# ---------------------------------------------------------------------------
class ContenidoBody(BaseModel):
    contenido: str


class MensajeBody(BaseModel):
    mensaje: str


class ReemplazaBody(BaseModel):
    reemplazaId: Optional[str] = None


def _norm(sol):
    paso_actual(sol)
    return sol


# ---------------------------------------------------------------------------
# Salud / config
# ---------------------------------------------------------------------------
@app.get("/api/health")
def health():
    return {"ok": True, "modelo": agents.info_modelo(), "storage": storage.info_backend(), "solicitudes": len(STORE)}


@app.get("/api/config")
def config():
    return {"modelo": agents.info_modelo(), "storage": storage.info_backend()}


# ---------------------------------------------------------------------------
# Solicitudes
# ---------------------------------------------------------------------------
@app.get("/api/solicitudes")
def listar(vista: str = "cx", area: Optional[str] = None):
    items = list(STORE.values())
    if vista == "sol":
        # Vista solicitante: simulamos el área "Productos" por defecto
        objetivo = area or "Productos"
        items = [s for s in items if s["area"] == objetivo]
    elif area:
        items = [s for s in items if s["area"] == area]
    items = [_norm(s) for s in items]
    return items


@app.get("/api/solicitudes/{sid}")
def detalle(sid: str):
    sol = service.get(sid)
    if not sol:
        raise HTTPException(404, "Solicitud no encontrada")
    return _norm(sol)


@app.post("/api/solicitudes")
async def crear(
    titulo: str = Form(...),
    remitente: str = Form("Solicitante"),
    area: str = Form(...),
    tipo: str = Form(...),
    contenido: str = Form(...),
    asesorNombre: str = Form(""),
    asesorTelefono: str = Form(""),
    imagenes: List[UploadFile] = File(default=[]),
):
    imgs = []
    for up in imagenes or []:
        if not up or not up.filename:
            continue
        data = await up.read()
        if not data:
            continue
        storage_id, gcs_path = storage.guardar_imagen(data, up.filename, up.content_type or "image/png")
        imgs.append({
            "id": "img-" + storage_id[:8], "storageId": storage_id, "nombre": up.filename,
            "gcsPath": gcs_path, "url": f"/api/imagenes/{storage_id}", "mime": up.content_type or "image/png",
            "validada": False, "ok": False, "resultado": "", "detalle": "", "observaciones": [], "sugerencias": [],
        })
    sol = service.crear_solicitud(
        titulo, remitente, area, tipo, contenido,
        {"nombre": asesorNombre, "telefono": asesorTelefono}, imgs,
    )
    return _norm(sol)


@app.post("/api/solicitudes/importar")
async def importar_msg(archivo: UploadFile = File(...), area: str = Form("Marketing")):
    """Ingiere un correo real de Outlook (.msg) y crea la solicitud (Paso 1) + dispara la validación."""
    nombre = (archivo.filename or "").lower()
    if not nombre.endswith(".msg"):
        raise HTTPException(400, "El archivo debe ser un .msg de Outlook")
    raw = await archivo.read()
    try:
        parsed = msg_import.parse_msg(raw, max_imgs=3, area=area)
    except Exception as e:
        raise HTTPException(422, f"No se pudo leer el .msg: {e}")

    imgs = []
    for im in parsed["imagenes"]:
        storage_id, gcs_path = storage.guardar_imagen(im["data"], im["nombre"], im["mime"])
        imgs.append({
            "id": "img-" + storage_id[:8], "storageId": storage_id, "nombre": im["nombre"],
            "gcsPath": gcs_path, "url": f"/api/imagenes/{storage_id}", "mime": im["mime"],
            "origen": im.get("origen"), "validada": False, "ok": False,
            "resultado": "", "detalle": "", "observaciones": [], "sugerencias": [],
        })

    sol = service.crear_solicitud(
        parsed["titulo"], parsed["remitente"], parsed["area"], parsed["tipo"],
        parsed["contenido"], {"nombre": "", "telefono": ""}, imgs,
    )
    sol["fecha"] = parsed["fecha"]
    sol["asunto"] = parsed.get("asunto")
    sol["importadoDe"] = "msg"
    sol["importMeta"] = parsed.get("meta")
    sol["correoHtml"] = parsed.get("correoHtml")
    preview = parsed.get("preview") or {}
    # El banner del mockup usa la imagen ya descargada/proxeada (robusto aunque el CDN bloquee);
    # si no se descargó ninguna, cae al URL público del CDN del correo.
    if preview:
        preview["bannerUrl"] = (imgs[0]["url"] if imgs else preview.get("bannerUrlCdn"))
    sol["preview"] = preview
    return _norm(sol)


@app.post("/api/solicitudes/{sid}/paso2/aceptar")
def paso2_aceptar(sid: str):
    sol = service.get(sid)
    if not sol:
        raise HTTPException(404, "Solicitud no encontrada")
    return _norm(service.aceptar_paso2(sol))


@app.post("/api/solicitudes/{sid}/paso2/revalidar")
def paso2_revalidar(sid: str, body: ContenidoBody):
    sol = service.get(sid)
    if not sol:
        raise HTTPException(404, "Solicitud no encontrada")
    return _norm(service.revalidar_paso2(sol, body.contenido))


@app.post("/api/solicitudes/{sid}/paso3/imagen")
async def paso3_imagen(sid: str, imagen: UploadFile = File(...), reemplazaId: str = Form(None)):
    sol = service.get(sid)
    if not sol:
        raise HTTPException(404, "Solicitud no encontrada")
    data = await imagen.read()
    storage_id, gcs_path = storage.guardar_imagen(data, imagen.filename, imagen.content_type or "image/png")
    return _norm(service.subir_imagen_paso3(sol, storage_id, gcs_path, imagen.filename,
                                            imagen.content_type or "image/png", reemplazaId))


@app.post("/api/solicitudes/{sid}/paso4/revalidar")
def paso4_revalidar(sid: str, body: ContenidoBody):
    sol = service.get(sid)
    if not sol:
        raise HTTPException(404, "Solicitud no encontrada")
    return _norm(service.revalidar_paso4(sol, body.contenido))


@app.post("/api/solicitudes/{sid}/paso4/aceptar")
def paso4_aceptar(sid: str):
    sol = service.get(sid)
    if not sol:
        raise HTTPException(404, "Solicitud no encontrada")
    return _norm(service.aceptar_paso4(sol))


@app.get("/api/solicitudes/{sid}/brief")
def brief(sid: str):
    sol = service.get(sid)
    if not sol:
        raise HTTPException(404, "Solicitud no encontrada")
    return {"brief": service.obtener_brief(sol)}


@app.post("/api/solicitudes/{sid}/aprobar")
def aprobar(sid: str):
    sol = service.get(sid)
    if not sol:
        raise HTTPException(404, "Solicitud no encontrada")
    return _norm(service.aprobar_cx(sol))


@app.post("/api/solicitudes/{sid}/publicar")
def publicar(sid: str):
    sol = service.get(sid)
    if not sol:
        raise HTTPException(404, "Solicitud no encontrada")
    return _norm(service.publicar(sol))


@app.post("/api/solicitudes/{sid}/rechazar")
def rechazar(sid: str, body: MensajeBody):
    sol = service.get(sid)
    if not sol:
        raise HTTPException(404, "Solicitud no encontrada")
    return _norm(service.rechazar_cx(sol, body.mensaje))


@app.post("/api/solicitudes/{sid}/consejo_rechazo")
def consejo_rechazo(sid: str):
    sol = service.get(sid)
    if not sol:
        raise HTTPException(404, "Solicitud no encontrada")
    texto = service.generar_consejo_rechazo(sol)
    return {"consejo": texto}


# ---------------------------------------------------------------------------
# Servir binarios de imágenes (proxy desde GCS/local)
# ---------------------------------------------------------------------------
@app.get("/api/imagenes/{storage_id}")
def imagen(storage_id: str):
    try:
        data = storage.leer_imagen(storage_id)
    except Exception:
        raise HTTPException(404, "Imagen no encontrada")
    ext = os.path.splitext(storage_id)[1].lower()
    mime = {".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
            ".gif": "image/gif", ".webp": "image/webp"}.get(ext, "application/octet-stream")
    return Response(content=data, media_type=mime)


# ---------------------------------------------------------------------------
# Frontend estático (React+Vite build). Debe ir al final (catch-all).
# ---------------------------------------------------------------------------
STATIC_DIR = os.getenv("STATIC_DIR", os.path.join(os.path.dirname(__file__), "static"))
if os.path.isdir(STATIC_DIR):
    app.mount("/", StaticFiles(directory=STATIC_DIR, html=True), name="static")
else:
    @app.get("/")
    def _root():
        return JSONResponse({"msg": "Frontend no compilado. API disponible en /api/*", "static_dir": STATIC_DIR})
