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
    """Carga 5 solicitudes pre-validadas (estados fijos) para demostrar el flujo al instante.

    Estos seeds usan feedback pre-calculado (no llaman a la IA en el arranque, para que la
    demo cargue rápido y sin depender de la red). Las solicitudes NUEVAS que se creen desde la
    UI sí ejecutan los agentes Gemini en vivo.
    """
    STORE.clear()
    _counter["n"] = 0
    seeds = [
        _base(
            id=nuevo_id(), titulo="Campaña SMS pago oportuno", remitente="María Quispe",
            fecha="18/06/2026", fechaCreacion="18/06/2026 08:15", area="Productos", tipo="SMS",
            contenido=("Estimado cliente apreciado, le informamos que en virtud de su condición crediticia "
                       "actual usted dispone de la posibilidad de efectuar el abono correspondiente a su "
                       "obligación financiera antes de la fecha límite estipulada para evitar penalidades."),
            asesor={"nombre": "Luis Pérez", "telefono": "987 654 321"},
            estados=_estados(p1="ok", p2="obs"),
            feedbackPaso2={
                "fallos": [
                    "Lenguaje muy formal y largo (no es simple ni cercano).",
                    "Supera buenas prácticas de SMS (mensaje extenso, >160 caracteres).",
                    "No incluye personalización ni datos del asesor.",
                    "Call to action poco claro.",
                ],
                "principios": ["Lenguaje simple y cercano", "Fácil de actuar (CTA claro)", "Considerar datos del Asesor de Negocios"],
                "contenidoCorregido": ("Hola {Nombre}, recuerda pagar tu cuota antes del 25/06 y evita recargos. "
                                       "Paga fácil en la app Mibanco. - Tu asesor: Luis Pérez"),
            },
        ),
        _base(
            id=nuevo_id(), titulo="Email bienvenida crédito", remitente="Jorge Ramos",
            fecha="18/06/2026", fechaCreacion="18/06/2026 10:30", area="Digital", tipo="Email",
            contenido="Hola {Nombre}, ¡bienvenido a Mibanco! Tu crédito ya está activo. Cualquier consulta escríbenos.",
            contenidoActual=("Hola {Nombre}, ¡bienvenido a Mibanco! Tu crédito ya está activo. Tu asesor {Asesor} "
                             "te acompañará. Ingresa a la app para ver tu cronograma."),
            asesor={"nombre": "Rosa Medina", "telefono": "999 111 222"},
            estados=_estados(p1="ok", p2="ok", p3="obs"),
            feedbackPaso2={
                "fallos": ["Falta incluir datos del asesor de negocios.", "Saludo correcto pero CTA mejorable."],
                "principios": ["Saludo y personalización", "Considerar datos del Asesor"],
                "contenidoCorregido": ("Hola {Nombre}, ¡bienvenido a Mibanco! Tu crédito ya está activo. Tu asesor {Asesor} "
                                       "te acompañará. Ingresa a la app para ver tu cronograma."),
            },
            imagenes=[
                {"id": "img-seed-1", "nombre": "banner_bienvenida.png", "gcsPath": None, "url": None,
                 "validada": True, "ok": False, "resultado": "Logo en color incorrecto (no es el verde Mibanco)",
                 "detalle": "El isotipo del sol debe ir en amarillo institucional sobre fondo verde. El banner usa un verde fuera de paleta.",
                 "observaciones": ["Verde fuera de la paleta oficial (#009639).", "El isotipo del sol no usa el amarillo institucional."],
                 "sugerencias": ["Reemplazar el verde por #009639.", "Usar el sol en amarillo institucional #F8D000."]},
                {"id": "img-seed-2", "nombre": "icono_app.png", "gcsPath": None, "url": None,
                 "validada": True, "ok": True, "resultado": "Cumple branding",
                 "detalle": "Proporciones y color correctos.", "observaciones": [], "sugerencias": []},
            ],
        ),
        _base(
            id=nuevo_id(), titulo="WhatsApp recordatorio cuota", remitente="Ana Torres",
            fecha="17/06/2026", fechaCreacion="17/06/2026 14:45", area="Negocios", tipo="WhatsApp",
            contenido="Hola {Nombre} 👋 te recordamos que tu cuota vence el 25/06. Paga en la app Mibanco. Tu asesor: {Asesor}.",
            asesor={"nombre": "Carlos Ruiz", "telefono": "955 333 444"},
            estados=_estados(p1="ok", p2="ok", p3="ok", p4="obs"),
            feedbackPaso4={
                "ok": False,
                "observaciones": [
                    "El mensaje no incluye el canal oficial de contacto.",
                    "Falta aclarar que el pago se realiza solo por canales Mibanco (riesgo de phishing).",
                ],
                "sugerencias": ["Agregar: 'Paga solo en la app oficial Mibanco o en agencias.'"],
                "contenidoCorregido": ("Hola {Nombre} 👋 te recordamos que tu cuota vence el 25/06. Paga solo en la app "
                                       "oficial Mibanco o en agencias. Tu asesor: {Asesor}."),
            },
        ),
        _base(
            id=nuevo_id(), titulo="Push promo seguro", remitente="Carla Díaz",
            fecha="16/06/2026", fechaCreacion="16/06/2026 09:00", area="Productos", tipo="Push notification",
            contenido="Protege tu negocio con el Seguro Mibanco. Actívalo desde la app.",
            asesor={"nombre": "Luis Pérez", "telefono": "987 654 321"},
            estados=_estados(p1="ok", p2="ok", p3="ok", p4="ok", p5="wait"),
            brief="",
        ),
        _base(
            id=nuevo_id(), titulo="SMS confirmación desembolso", remitente="Pedro Soto",
            fecha="15/06/2026", fechaCreacion="15/06/2026 11:20", area="Digital", tipo="SMS",
            contenido="Hola {Nombre}, tu desembolso fue realizado. Revisa tu cuenta. - Mibanco Oficial",
            asesor={"nombre": "Rosa Medina", "telefono": "999 111 222"},
            estados=_estados(p1="ok", p2="ok", p3="ok", p4="ok", p5="ok"),
            aprobadoCX=True,
            brief=("Pieza: SMS - Confirmacion de desembolso (Area Digital). Version final: 'Hola {Nombre}, tu "
                   "desembolso fue realizado. Revisa tu cuenta. - Mibanco Oficial'. Redaccion: OK (claro, breve, "
                   "remitente oficial). Marca/imagenes: no aplica. Legal: OK (sin datos sensibles, sin promesas "
                   "indebidas). Recomendacion: aprobado para envio."),
        ),
    ]

    # Correo .msg real (SHIRLEY) ya importado: muestra el preview del correo + el antes/después
    # con resaltado verde, sin necesidad de importar en vivo. Área Productos → visible en ambas vistas.
    cuerpo_correo = (
        "Hola, SHIRLEY\n\n"
        "Ahora puedes registrarte y usar tu App Mibanco solo con tu tarjeta de débito. "
        "Acércate a la agencia Mibanco y solicítala para disfrutar de los beneficios de la app.\n\n"
        "Descubre lo que puedes hacer en la App Mibanco:\n\n"
        "Transfiere GRATIS todos los días de 6 a.m a 12 a.m.\n\n"
        "Desembolsa tu línea de crédito en minutos.\n\n"
        "Paga tus préstamos sin comisiones.\n\n"
        "Abre tu cuenta de ahorro y alcanza tus metas.\n\n"
        "Realiza tus recargas y pagos de servicios en pocos pasos.\n\n"
        "Obtén tu tarjeta de débito, regístrate en minutos y comienza a disfrutar de todo lo "
        "que la App Mibanco te permite hacer hoy."
    )
    correo = _base(
        id=nuevo_id(), titulo="Ingresa a la App Mibanco con tu tarjeta de débito",
        remitente="MiBanco", fecha="28/04/2026", area="Productos", tipo="Email",
        contenido=cuerpo_correo,
        asesor={"nombre": "Luis Pérez", "telefono": "987 654 321"},
        estados=_estados(p1="ok", p2="obs"),
        feedbackPaso2={
            "fallos": [
                "El cuerpo es muy largo para un email; conviene resumir los beneficios clave.",
                "Falta personalización con el nombre del cliente ({Nombre}).",
                "No incluye los datos del Asesor de Negocios (requerido en Email).",
                "El llamado a la acción puede ser más claro y directo.",
            ],
            "principios": ["Lenguaje simple y cercano", "Fácil de actuar (CTA claro)", "Considerar datos del Asesor de Negocios"],
            "contenidoCorregido": (
                "Hola {Nombre} 👋, ¡buenas noticias! Ya puedes registrarte en la App Mibanco solo con tu "
                "tarjeta de débito. Acércate a tu agencia Mibanco más cercana y solicítala.\n\n"
                "Con la app puedes transferir gratis todos los días, pagar tus préstamos sin comisiones y "
                "desembolsar tu línea de crédito en minutos.\n\n"
                "Actívala hoy y maneja tu negocio desde tu celular. Tu asesor {Asesor} te acompaña en cada paso."
            ),
        },
    )
    correo["importadoDe"] = "msg"
    correo["asunto"] = _PREVIEW_SHIRLEY.get("asunto", correo["titulo"])
    correo["preview"] = _PREVIEW_SHIRLEY
    correo["correoHtml"] = _CORREO_SHIRLEY_HTML
    seeds.append(correo)

    for s in seeds:
        STORE[s["id"]] = s
    return STORE
