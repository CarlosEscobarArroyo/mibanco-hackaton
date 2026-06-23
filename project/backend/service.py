"""
Orquestación del flujo de 5 pasos.

Estados por paso: locked | proc | obs | wait | ok
"""
import agents
import criterios
import storage
from store import STORE, log, nuevo_id, paso_actual, hoy, ahora, _estados


def _tiene_keyword_riesgo(texto: str) -> bool:
    t = (texto or "").lower()
    return any(k in t for k in criterios.KEYWORDS_REVISION_HUMANA)


def _aplicar_severidad(sol, res, etiqueta_paso):
    """Escala a revisión humana cuando un agente detecta nivel 'alerta' o 'critico'.

    Realiza el mapa del documento: nivel 3 (naranja) y 4 (rojo) NO se auto-aprueban.
    Solo añade información (no rompe el flujo binario basado en 'cumple').
    """
    nivel = str(res.get("nivel", "")).lower()
    if not res.get("requiere_revision_humana") and nivel not in ("alerta", "critico"):
        return
    sol["requiereRevisionHumana"] = True
    if sol.get("tipoRiesgo", "normal") in ("", "normal"):
        sol["tipoRiesgo"] = "crítico — bloqueo" if nivel == "critico" else "alerta normativa"
    log(sol, "Agente IA",
        f"{etiqueta_paso}: nivel '{nivel or 'alerta'}' — escalado a revisión humana "
        f"(acción sugerida: {res.get('accion', 'escalar')}).")


def get(sid: str):
    return STORE.get(sid)


# ---------------------------------------------------------------------------
# Crear solicitud (Paso 1) + disparar Paso 2
# ---------------------------------------------------------------------------
def crear_solicitud(titulo, remitente, area, tipo, contenido, asesor, imagenes):
    sid = nuevo_id()
    sol = {
        "id": sid,
        "titulo": titulo or f"Comunicación {tipo}",
        "remitente": remitente or "Solicitante",
        "fecha": hoy(),
        "area": area or "Productos",
        "tipo": tipo or "SMS",
        "contenidoOriginal": contenido,
        "contenidoActual": contenido,
        "asesor": asesor or {"nombre": "", "telefono": ""},
        "imagenes": imagenes or [],
        "pasoActual": 1,
        "estados": _estados(p1="ok"),
        "feedbackPaso2": {"fallos": [], "principios": [], "contenidoCorregido": ""},
        "feedbackPaso3": [],
        "feedbackPaso4": {"ok": True, "observaciones": [], "sugerencias": [], "contenidoCorregido": ""},
        "brief": "",
        "aprobadoCX": False,
        "publicado": False,
        "requiereRevisionHumana": False,
        "tipoRiesgo": "normal",
        "historial": [{"ts": ahora(), "actor": "sistema", "accion": "Solicitud recibida e interpretada (Paso 1)"}],
    }
    STORE[sid] = sol

    # Agente 1: clasificación / revisión humana obligatoria
    clasif = agents.clasificar(tipo, contenido)
    riesgo_kw = _tiene_keyword_riesgo(f"{titulo} {contenido}")
    sol["tipoRiesgo"] = clasif.get("tipo_riesgo", "normal")
    sol["requiereRevisionHumana"] = bool(clasif.get("requiere_revision_humana")) or riesgo_kw
    if sol["requiereRevisionHumana"]:
        sol["tipoRiesgo"] = sol["tipoRiesgo"] if sol["tipoRiesgo"] != "normal" else (sol["tipoRiesgo"])
        log(sol, "Agente IA", f"Marcada para revisión humana obligatoria ({sol['tipoRiesgo']}).")

    # Dispara Paso 2 automáticamente
    _ejecutar_paso2(sol)
    paso_actual(sol)
    return sol


# ---------------------------------------------------------------------------
# Paso 2 — Redacción
# ---------------------------------------------------------------------------
def _ejecutar_paso2(sol):
    sol["estados"]["paso2"] = "proc"
    res = agents.validar_redaccion(sol["tipo"], sol["contenidoActual"], sol["asesor"])
    sol["feedbackPaso2"] = {
        "fallos": res.get("fallos", []),
        "principios": res.get("principios_afectados", []),
        "contenidoCorregido": res.get("contenido_corregido", sol["contenidoActual"]),
        "nivel": res.get("nivel", "aprobado"),
        "accion": res.get("accion", "aprobar"),
    }
    _aplicar_severidad(sol, res, "Paso 2 (redacción)")
    if res.get("cumple"):
        sol["estados"]["paso2"] = "ok"
        log(sol, "Agente IA", "Paso 2 (redacción): sin observaciones.")
        _avanzar_a_paso3(sol)
    else:
        sol["estados"]["paso2"] = "obs"
        log(sol, "Agente IA", f"Paso 2 (redacción): {len(res.get('fallos', []))} observación(es).")
    return sol


def aceptar_paso2(sol):
    if sol["estados"]["paso2"] not in ("obs", "proc"):
        return sol
    nuevo = sol["feedbackPaso2"].get("contenidoCorregido") or sol["contenidoActual"]
    sol["contenidoActual"] = nuevo
    sol["estados"]["paso2"] = "ok"
    log(sol, "Solicitante", "Aceptó la corrección de redacción de la IA (Paso 2).")
    _avanzar_a_paso3(sol)
    paso_actual(sol)
    return sol


def revalidar_paso2(sol, contenido):
    sol["contenidoActual"] = contenido
    log(sol, "Solicitante", "Envió su propia versión para re-validar (Paso 2).")
    _ejecutar_paso2(sol)
    paso_actual(sol)
    return sol


# ---------------------------------------------------------------------------
# Paso 3 — Marca / imágenes
# ---------------------------------------------------------------------------
def _avanzar_a_paso3(sol):
    if not sol.get("imagenes"):
        sol["estados"]["paso3"] = "ok"
        log(sol, "Agente IA", "Paso 3 (marca): sin imágenes, no aplica.")
        _avanzar_a_paso4(sol)
        return sol
    sol["estados"]["paso3"] = "proc"
    for img in sol["imagenes"]:
        if not img.get("validada"):
            _validar_imagen(sol, img)
    _recalcular_paso3(sol)
    return sol


def _validar_imagen(sol, img):
    try:
        data = storage.leer_imagen(img["storageId"])
        res = agents.validar_imagen(data, img.get("mime", "image/png"), img.get("nombre", "imagen"))
    except Exception as e:
        res = {"cumple": False, "observaciones": [f"No se pudo leer/validar la imagen: {e}"], "sugerencias": []}
    img["validada"] = True
    img["ok"] = bool(res.get("cumple"))
    img["observaciones"] = res.get("observaciones", [])
    img["sugerencias"] = res.get("sugerencias", [])
    if img["ok"]:
        img["resultado"] = "Cumple branding"
        img["detalle"] = "El agente validó la imagen: colores, logo y proporciones correctos."
    else:
        img["resultado"] = (res.get("observaciones") or ["No cumple branding"])[0]
        img["detalle"] = " ".join(res.get("sugerencias", [])) or "Revisa la paleta y el logo de Mibanco."


def _recalcular_paso3(sol):
    if all(i.get("ok") for i in sol["imagenes"]):
        sol["estados"]["paso3"] = "ok"
        log(sol, "Agente IA", "Paso 3 (marca): todas las imágenes cumplen.")
        _avanzar_a_paso4(sol)
    else:
        sol["estados"]["paso3"] = "obs"
        log(sol, "Agente IA", "Paso 3 (marca): hay imágenes con observaciones.")
    return sol


def subir_imagen_paso3(sol, storage_id, gcs_path, nombre, mime, reemplaza_id=None):
    nueva = {
        "id": "img-" + storage_id[:8], "storageId": storage_id, "nombre": nombre,
        "gcsPath": gcs_path, "url": f"/api/imagenes/{storage_id}", "mime": mime,
        "validada": False, "ok": False, "resultado": "", "detalle": "", "observaciones": [], "sugerencias": [],
    }
    if reemplaza_id:
        sol["imagenes"] = [i for i in sol["imagenes"] if i.get("id") != reemplaza_id]
    sol["imagenes"].append(nueva)
    log(sol, "Solicitante", f"Subió nueva imagen '{nombre}' (Paso 3).")
    sol["estados"]["paso3"] = "proc"
    _validar_imagen(sol, nueva)
    _recalcular_paso3(sol)
    paso_actual(sol)
    return sol


# ---------------------------------------------------------------------------
# Paso 4 — Legal y cumplimiento
# ---------------------------------------------------------------------------
def _avanzar_a_paso4(sol):
    sol["estados"]["paso4"] = "proc"
    res = agents.validar_legal(sol["contenidoActual"], sol["tipo"])
    sol["feedbackPaso4"] = {
        "ok": bool(res.get("cumple")),
        "observaciones": res.get("observaciones", []),
        "sugerencias": res.get("sugerencias", []),
        "contenidoCorregido": res.get("contenido_corregido", sol["contenidoActual"]),
        "nivel": res.get("nivel", "aprobado"),
        "accion": res.get("accion", "aprobar"),
        "normas": res.get("normas", []),
    }
    _aplicar_severidad(sol, res, "Paso 4 (legal)")
    if res.get("cumple"):
        sol["estados"]["paso4"] = "ok"
        log(sol, "Agente IA", "Paso 4 (legal): sin observaciones.")
        _avanzar_a_paso5(sol)
    else:
        sol["estados"]["paso4"] = "obs"
        log(sol, "Agente IA", f"Paso 4 (legal): {len(res.get('observaciones', []))} observación(es).")
    return sol


def aceptar_paso4(sol):
    if sol["estados"]["paso4"] not in ("obs", "proc"):
        return sol
    nuevo = sol["feedbackPaso4"].get("contenidoCorregido") or sol["contenidoActual"]
    sol["contenidoActual"] = nuevo
    sol["estados"]["paso4"] = "ok"
    log(sol, "Solicitante", "Aceptó el ajuste legal sugerido (Paso 4).")
    _avanzar_a_paso5(sol)
    paso_actual(sol)
    return sol


def revalidar_paso4(sol, contenido):
    sol["contenidoActual"] = contenido
    log(sol, "Solicitante", "Envió versión ajustada para re-validar con Legal (Paso 4).")
    _avanzar_a_paso4(sol)
    paso_actual(sol)
    return sol


# ---------------------------------------------------------------------------
# Paso 5 — Brief + Aprobación CX
# ---------------------------------------------------------------------------
def _avanzar_a_paso5(sol):
    sol["estados"]["paso5"] = "wait"
    sol["brief"] = agents.generar_brief(sol)
    log(sol, "Agente IA", "Paso 5: brief generado. En espera de aprobación CX.")
    return sol


def obtener_brief(sol):
    if not sol.get("brief"):
        sol["brief"] = agents.generar_brief(sol)
    return sol["brief"]


def aprobar_cx(sol):
    if sol["estados"]["paso5"] != "wait":
        # genera brief si aún no estaba listo pero el resto está ok
        if all(sol["estados"][f"paso{i}"] == "ok" for i in range(1, 5)):
            _avanzar_a_paso5(sol)
        else:
            return sol
    sol["aprobadoCX"] = True
    sol["estados"]["paso5"] = "ok"
    log(sol, "CX", "Aprobó la solicitud (Paso 5).")
    paso_actual(sol)
    return sol


def publicar(sol):
    if not sol.get("aprobadoCX"):
        return sol
    sol["publicado"] = True
    log(sol, "Solicitante", "Publicó la comunicación.")
    return sol
