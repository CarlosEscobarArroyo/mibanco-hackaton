"""
Almacén en memoria (RAM). NO hay base de datos.

Si el servicio reinicia, los datos se pierden (es un MVP de demo). Por eso Cloud Run
se despliega con --min-instances=1 --max-instances=1: todas las peticiones pegan a la
misma instancia.

Las imágenes NO se guardan aquí: solo su referencia (storage_id + gcsPath). El binario
vive en GCS (o ./uploads en local).
"""
import json as _json
import os
from datetime import datetime

# Artefactos de un correo .msg real (SHIRLEY) para el seed: HTML sanitizado + modelo de preview.
# Permiten demostrar el preview del correo y el antes/después sin importar en vivo.
_SEED_DIR = os.path.join(os.path.dirname(__file__), "seed_data")


def _leer_seed(nombre: str, default: str = "") -> str:
    try:
        with open(os.path.join(_SEED_DIR, nombre), encoding="utf-8") as f:
            return f.read()
    except Exception:
        return default


_CORREO_SHIRLEY_HTML = _leer_seed("correo_shirley.html")
try:
    _PREVIEW_SHIRLEY = _json.loads(_leer_seed("preview_shirley.json", "{}"))
except Exception:
    _PREVIEW_SHIRLEY = {}

# dict[str, Solicitud]
STORE: dict = {}

_counter = {"n": 0}

ESTADOS_VALIDOS = {"locked", "proc", "obs", "wait", "ok"}


def ahora() -> str:
    return datetime.now().strftime("%d/%m/%Y %H:%M")


def hoy() -> str:
    return datetime.now().strftime("%d/%m/%Y")


def nuevo_id() -> str:
    _counter["n"] += 1
    return f"SOL-{_counter['n']:03d}"


def log(sol: dict, actor: str, accion: str):
    sol.setdefault("historial", []).append({"ts": ahora(), "actor": actor, "accion": accion})


def paso_actual(sol: dict) -> int:
    estados = sol["estados"]
    actual = 1
    for i in range(1, 6):
        e = estados[f"paso{i}"]
        if e in ("ok",):
            actual = min(i + 1, 5)
        elif e in ("obs", "proc", "wait"):
            actual = i
            break
        elif e == "locked":
            break
    sol["pasoActual"] = actual
    return actual


def _estados(p1="locked", p2="locked", p3="locked", p4="locked", p5="locked"):
    return {"paso1": p1, "paso2": p2, "paso3": p3, "paso4": p4, "paso5": p5}


def _base(**kw):
    sol = {
        "id": kw["id"],
        "titulo": kw["titulo"],
        "remitente": kw["remitente"],
        "fecha": kw.get("fecha", hoy()),
        "fechaCreacion": kw.get("fechaCreacion", kw.get("fecha", hoy()) + " 09:00"),
        "area": kw["area"],
        "tipo": kw["tipo"],
        "contenidoOriginal": kw["contenido"],
        "contenidoActual": kw.get("contenidoActual", kw["contenido"]),
        "asesor": kw.get("asesor", {"nombre": "", "telefono": ""}),
        "imagenes": kw.get("imagenes", []),
        "pasoActual": 1,
        "estados": kw.get("estados", _estados(p1="ok")),
        "feedbackPaso2": kw.get("feedbackPaso2", {"fallos": [], "principios": [], "contenidoCorregido": ""}),
        "feedbackPaso3": kw.get("feedbackPaso3", []),
        "feedbackPaso4": kw.get("feedbackPaso4", {"ok": True, "observaciones": [], "sugerencias": [], "contenidoCorregido": ""}),
        "brief": kw.get("brief", ""),
        "aprobadoCX": kw.get("aprobadoCX", False),
        "publicado": kw.get("publicado", False),
        "requiereRevisionHumana": kw.get("requiereRevisionHumana", False),
        "tipoRiesgo": kw.get("tipoRiesgo", "normal"),
        "historial": kw.get("historial", [{"ts": ahora(), "actor": "sistema", "accion": "Solicitud recibida (Paso 1)"}]),
    }
    paso_actual(sol)
    return sol


def seed():
    """8 solicitudes representativas de comunicaciones reales de Mibanco para demo.

    Feedback pre-calculado: no llaman a la IA en el arranque. Las solicitudes NUEVAS
    que se creen desde la UI sí ejecutan los agentes Gemini en vivo.

    Dashboard resultante: 8 total | 3 publicadas | 3 con obs | 1 esperando CX | 1 en proceso
    """
    STORE.clear()
    _counter["n"] = 0

    # SOL-001 — SMS aprobado y publicado
    s1 = _base(
        id=nuevo_id(), titulo="Recordatorio de pago de cuota",
        remitente="María Quispe", fecha="10/06/2026", fechaCreacion="10/06/2026 08:15",
        area="Productos", tipo="SMS",
        contenido="Hola {Nombre}, recuerda pagar tu cuota antes del {fecha}. Evita recargos. Paga fácil en la app Mibanco. Tu asesor: {Asesor}.",
        asesor={"nombre": "Carlos Ruiz", "telefono": "987 654 321"},
        estados=_estados(p1="ok", p2="ok", p3="ok", p4="ok", p5="ok"),
        aprobadoCX=True, publicado=True,
        feedbackPaso2={"fallos": [], "principios": [], "contenidoCorregido": ""},
        brief="Pieza: SMS — Recordatorio de pago (Área Productos). Redacción: OK (breve, personalizado, CTA directo). Legal: OK. Recomendación: aprobado para envío.",
        historial=[
            {"ts": "10/06/2026 08:15", "actor": "sistema", "accion": "Solicitud recibida (Paso 1)"},
            {"ts": "10/06/2026 08:17", "actor": "Agente IA Redacción", "accion": "Redacción aprobada sin observaciones"},
            {"ts": "10/06/2026 08:19", "actor": "Agente IA Marca", "accion": "Sin imágenes — validación de marca no aplica"},
            {"ts": "10/06/2026 08:21", "actor": "Agente IA Legal", "accion": "Validación legal: sin riesgos detectados"},
            {"ts": "10/06/2026 08:23", "actor": "sistema", "accion": "Aprobación automática por IA — todos los agentes aprobaron sin observaciones"},
            {"ts": "10/06/2026 09:05", "actor": "CX", "accion": "Solicitud aprobada y publicada"},
        ],
    )

    # SOL-002 — Email con observaciones en redacción
    s2 = _base(
        id=nuevo_id(), titulo="Bienvenida a crédito aprobado",
        remitente="Jorge Ramos", fecha="15/06/2026", fechaCreacion="15/06/2026 10:30",
        area="Digital", tipo="Email",
        contenido=(
            "Estimado cliente, nos complace informarle que su solicitud de crédito ha sido "
            "procesada satisfactoriamente por nuestro sistema de evaluación crediticia y ha "
            "resultado en una aprobación favorable de su línea de financiamiento."
        ),
        asesor={"nombre": "Rosa Medina", "telefono": "999 111 222"},
        estados=_estados(p1="ok", p2="obs"),
        feedbackPaso2={
            "fallos": [
                "Lenguaje muy formal y poco cercano",
                "Sin saludo personalizado",
                "Sin CTA claro",
                "No menciona al asesor de negocios",
            ],
            "principios": ["Lenguaje simple y cercano", "Saludo personalizado", "CTA claro", "Datos del Asesor de Negocios"],
            "contenidoCorregido": (
                "Hola {Nombre}, tu crédito fue aprobado. Acércate a tu agencia o llama a tu "
                "asesor {Asesor} al {telefono} para coordinar el desembolso. Te esperamos."
            ),
        },
    )

    # SOL-003 — Push notification esperando aprobación CX (oferta comercial)
    s3 = _base(
        id=nuevo_id(), titulo="Promo seguro para tu negocio",
        remitente="Carla Díaz", fecha="17/06/2026", fechaCreacion="17/06/2026 14:00",
        area="Productos", tipo="Push notification",
        contenido="Activa el Seguro Mibanco y cuida lo que más te importa. Desde S/5 al mes. Activa en la app.",
        asesor={"nombre": "Luis Pérez", "telefono": "987 654 321"},
        estados=_estados(p1="ok", p2="ok", p3="ok", p4="ok", p5="wait"),
        requiereRevisionHumana=True, tipoRiesgo="oferta comercial",
        brief=(
            "Pieza: Push notification — Promo seguro (Área Productos). Redacción: OK (conciso, CTA directo). "
            "Marca: OK. Legal: sin observaciones críticas. Contiene oferta comercial — requiere revisión "
            "obligatoria del equipo CX antes de la aprobación final."
        ),
    )

    # SOL-004 — WhatsApp aprobado y publicado
    s4 = _base(
        id=nuevo_id(), titulo="Recordatorio vencimiento cuota WhatsApp",
        remitente="Ana Torres", fecha="13/06/2026", fechaCreacion="13/06/2026 09:00",
        area="Negocios", tipo="WhatsApp",
        contenido="Hola {Nombre}, te recordamos que tu cuota vence el {fecha}. Paga en la app Mibanco. Tu asesor: {Asesor}.",
        asesor={"nombre": "Carlos Ruiz", "telefono": "955 333 444"},
        estados=_estados(p1="ok", p2="ok", p3="ok", p4="ok", p5="ok"),
        aprobadoCX=True, publicado=True,
        brief=(
            "Pieza: WhatsApp — Recordatorio de cuota (Área Negocios). Redacción: OK (breve, "
            "personalizado, CTA claro). Legal: OK. Recomendación: aprobado para envío."
        ),
    )

    # SOL-005 — Email con obs en redacción y legal, revisión humana obligatoria
    s5 = _base(
        id=nuevo_id(), titulo="Oferta de ampliación de línea de crédito",
        remitente="Pedro Soto", fecha="19/06/2026", fechaCreacion="19/06/2026 11:00",
        area="Productos", tipo="Email",
        contenido=(
            "Le informamos que puede acceder a una ampliación de hasta S/50,000 en su línea de "
            "crédito con una tasa preferencial garantizada del 0% los primeros 3 meses."
        ),
        asesor={"nombre": "Luis Pérez", "telefono": "987 654 321"},
        estados=_estados(p1="ok", p2="obs", p3="ok", p4="obs"),
        feedbackPaso2={
            "fallos": ["Promesa de tasa 0% requiere verificación legal antes de su comunicación al cliente"],
            "principios": ["Precisión y veracidad en ofertas comerciales"],
            "contenidoCorregido": "",
        },
        feedbackPaso4={
            "ok": False,
            "observaciones": [
                "Promesa de tasa garantizada sin respaldo documental adjunto",
                "Posible incumplimiento Res. SBS 3274-2017 — publicidad engañosa",
            ],
            "sugerencias": [
                "Adjuntar condiciones legales de la oferta antes de comunicar.",
                "Reemplazar 'garantizada del 0%' por 'sujeta a evaluación crediticia'.",
            ],
            "contenidoCorregido": "",
        },
        requiereRevisionHumana=True,
        tipoRiesgo="oferta comercial",
    )

    # SOL-006 — SMS en proceso (agente de redacción activo)
    s6 = _base(
        id=nuevo_id(), titulo="Campaña cobranza cuota vencida",
        remitente="Luis Mendoza", fecha="22/06/2026", fechaCreacion="22/06/2026 15:30",
        area="Negocios", tipo="SMS",
        contenido=(
            "MIBANCO: Su cuota de S/320 venció el 01/06. Regularice su pago para evitar "
            "reportes a centrales de riesgo. Llame al 0800-00-900."
        ),
        asesor={"nombre": "Rosa Medina", "telefono": "999 111 222"},
        estados=_estados(p1="ok", p2="proc"),
    )

    # SOL-007 — Email aprobado y publicado
    s7 = _base(
        id=nuevo_id(), titulo="Ingresa a la App Mibanco con tu tarjeta de débito",
        remitente="MiBanco Digital", fecha="05/06/2026", fechaCreacion="05/06/2026 10:00",
        area="Productos", tipo="Email",
        contenido=(
            "Hola {Nombre}, ahora puedes registrarte en la App Mibanco solo con tu tarjeta de débito. "
            "Acércate a tu agencia más cercana y solicita tu acceso. Con la app puedes transferir gratis, "
            "pagar tus préstamos sin comisiones y desembolsar tu línea de crédito en minutos. "
            "Tu asesor {Asesor} te acompaña en cada paso."
        ),
        asesor={"nombre": "Carlos Ruiz", "telefono": "987 654 321"},
        estados=_estados(p1="ok", p2="ok", p3="ok", p4="ok", p5="ok"),
        aprobadoCX=True, publicado=True,
        brief=(
            "Pieza: Email — App Mibanco con tarjeta de débito (Área Productos). Redacción: OK "
            "(tono cercano, personalizado, múltiples beneficios con CTA claro). Marca: OK. "
            "Legal: OK. Recomendación: aprobado para envío."
        ),
    )

    # SOL-008 — Email revisión humana por reclamo de cliente
    s8 = _base(
        id=nuevo_id(), titulo="Respuesta a cliente insatisfecho por cobro",
        remitente="Carmen Flores", fecha="24/06/2026", fechaCreacion="24/06/2026 09:45",
        area="Negocios", tipo="Email",
        contenido=(
            "Estimado cliente, en respuesta a su reclamo por el cobro indebido registrado en su cuenta, "
            "le informamos que hemos iniciado una investigación interna que tomará un plazo de 30 días "
            "hábiles según normativa."
        ),
        asesor={"nombre": "Rosa Medina", "telefono": "999 111 222"},
        estados=_estados(p1="ok", p2="obs"),
        feedbackPaso2={
            "fallos": [
                "Lenguaje muy formal, sin personalización",
                "Sin nombre del asesor responsable del caso",
                "No incluye canal de seguimiento del reclamo",
            ],
            "principios": ["Personalización", "Datos del Asesor de Negocios", "Canales de atención claros"],
            "contenidoCorregido": (
                "Hola {Nombre}, recibimos tu reclamo por el cobro del {fecha}. Ya iniciamos la "
                "investigación — te avisaremos en un máximo de 30 días hábiles. Tu asesor {Asesor} "
                "está disponible en el {telefono} para cualquier consulta."
            ),
        },
        requiereRevisionHumana=True,
        tipoRiesgo="reclamo",
    )

    for s in [s1, s2, s3, s4, s5, s6, s7, s8]:
        STORE[s["id"]] = s
    return STORE
