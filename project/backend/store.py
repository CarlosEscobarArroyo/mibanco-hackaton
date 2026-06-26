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
from datetime import datetime, timedelta

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
    """12 solicitudes representativas de comunicaciones reales de Mibanco para demo.

    Fechas calculadas dinámicamente (relativas al arranque) para que el seed
    siempre sea fresco. No llaman a la IA al inicio.

    Dashboard: 12 total | 4 publicadas | 5 obs | 1 esperando CX | 2 en proceso
    Revisiones humanas activas: 3 (SOL-003 oferta, SOL-008 reclamo, SOL-011 crisis)
    """
    STORE.clear()
    _counter["n"] = 0

    def _fecha(dias):
        return (datetime.now() - timedelta(days=dias)).strftime("%d/%m/%Y")

    def _ts(dias, hora="09:00"):
        return (datetime.now() - timedelta(days=dias)).strftime(f"%d/%m/%Y {hora}")

    # SOL-001 — SMS aprobado y publicado (hace 20 días)
    s1 = _base(
        id=nuevo_id(), titulo="Recordatorio de pago de cuota",
        remitente="Maria Quispe", fecha=_fecha(20), fechaCreacion=_ts(20, "08:15"),
        area="Productos", tipo="SMS",
        contenido="Hola {Nombre}, recuerda pagar tu cuota antes del {fecha}. Evita recargos. Paga facil en la app Mibanco. Tu asesor: {Asesor}.",
        asesor={"nombre": "Luis Perez", "telefono": ""},
        estados=_estados(p1="ok", p2="ok", p3="ok", p4="ok", p5="ok"),
        feedbackPaso2={"fallos": [], "principios": [], "contenidoCorregido": ""},
        feedbackPaso4={"ok": True, "observaciones": [], "sugerencias": [], "contenidoCorregido": ""},
        aprobadoCX=True, publicado=True,
        historial=[
            {"ts": _ts(20, "08:15"), "actor": "sistema", "accion": "Solicitud recibida (Paso 1)"},
            {"ts": _ts(20, "08:17"), "actor": "Agente IA", "accion": "Redaccion aprobada sin observaciones (Paso 2)"},
            {"ts": _ts(20, "08:18"), "actor": "Agente IA", "accion": "Sin imagenes adjuntas, paso aprobado (Paso 3)"},
            {"ts": _ts(20, "08:20"), "actor": "Agente IA", "accion": "Sin riesgos legales detectados (Paso 4)"},
            {"ts": _ts(20, "08:22"), "actor": "sistema", "accion": "Aprobacion automatica por IA - todos los agentes aprobaron sin observaciones (Paso 5)"},
            {"ts": _ts(20, "09:05"), "actor": "sistema", "accion": "Comunicacion publicada"},
        ],
    )

    # SOL-002 — Email con observaciones en redacción (hace 12 días)
    s2 = _base(
        id=nuevo_id(), titulo="Bienvenida a credito aprobado",
        remitente="Jorge Ramos", fecha=_fecha(12), fechaCreacion=_ts(12, "10:30"),
        area="Digital", tipo="Email",
        contenido=(
            "Estimado cliente, nos complace informarle que su solicitud de credito ha sido "
            "procesada satisfactoriamente por nuestro sistema de evaluacion crediticia y ha "
            "resultado en una aprobacion favorable de su linea de financiamiento. Para proceder "
            "con el desembolso debera acercarse a la oficina mas proxima portando su "
            "documentacion en regla."
        ),
        asesor={"nombre": "Carmen Villanueva", "telefono": ""},
        estados=_estados(p1="ok", p2="obs"),
        feedbackPaso2={
            "fallos": [
                "Lenguaje muy formal y poco cercano para el publico microempresario",
                "Sin saludo personalizado con nombre del cliente",
                "Sin CTA claro - no indica que debe hacer exactamente",
                "No menciona al asesor de negocios ni su contacto",
                "Mensaje demasiado largo para un email de bienvenida",
            ],
            "principios": [
                "Lenguaje simple y cercano",
                "Facil de actuar - CTA claro",
                "Personalizado con datos del asesor",
            ],
            "contenidoCorregido": (
                "Hola {Nombre}, tu credito fue aprobado. Acercate a tu agencia Mibanco mas "
                "cercana o llama a tu asesor {Asesor} para coordinar el desembolso. "
                "Te esperamos con gusto."
            ),
        },
        historial=[
            {"ts": _ts(12, "10:30"), "actor": "sistema", "accion": "Solicitud recibida (Paso 1)"},
            {"ts": _ts(12, "10:33"), "actor": "Agente IA", "accion": "Observaciones detectadas en redaccion (Paso 2)"},
        ],
    )

    # SOL-003 — Push notification esperando CX (oferta comercial, hace 9 días)
    s3 = _base(
        id=nuevo_id(), titulo="Promo seguro para tu negocio",
        remitente="Carla Diaz", fecha=_fecha(9), fechaCreacion=_ts(9, "14:00"),
        area="Productos", tipo="Push notification",
        contenido="Activa el Seguro Mibanco y cuida lo que mas te importa. Desde S/5 al mes. Activa ahora en la app.",
        asesor={"nombre": "Roberto Huanca", "telefono": ""},
        estados=_estados(p1="ok", p2="ok", p3="ok", p4="ok", p5="wait"),
        feedbackPaso2={"fallos": [], "principios": [], "contenidoCorregido": ""},
        feedbackPaso4={"ok": True, "observaciones": [], "sugerencias": [], "contenidoCorregido": ""},
        requiereRevisionHumana=True, tipoRiesgo="oferta comercial",
        brief=(
            "Pieza tipo Push notification del area Productos. Canal: app movil Mibanco. "
            "Mensaje promocional de seguro para negocios. Redaccion aprobada - lenguaje claro "
            "y CTA directo. Marca aprobada. Legal aprobado. Requiere aprobacion CX por ser "
            "oferta comercial de producto financiero segun politica interna."
        ),
        historial=[
            {"ts": _ts(9, "14:00"), "actor": "sistema", "accion": "Solicitud recibida (Paso 1)"},
            {"ts": _ts(9, "14:02"), "actor": "Agente IA", "accion": "Redaccion aprobada (Paso 2)"},
            {"ts": _ts(9, "14:03"), "actor": "Agente IA", "accion": "Sin imagenes, paso aprobado (Paso 3)"},
            {"ts": _ts(9, "14:05"), "actor": "Agente IA", "accion": "Sin riesgos legales (Paso 4)"},
            {"ts": _ts(9, "14:07"), "actor": "sistema", "accion": "Brief generado. Pendiente aprobacion CX por oferta comercial (Paso 5)"},
        ],
    )

    # SOL-004 — WhatsApp aprobado y publicado (hace 18 días)
    s4 = _base(
        id=nuevo_id(), titulo="Recordatorio vencimiento cuota WhatsApp",
        remitente="Ana Torres", fecha=_fecha(18), fechaCreacion=_ts(18, "09:00"),
        area="Negocios", tipo="WhatsApp",
        contenido=(
            "Hola {Nombre}, te recordamos que tu cuota vence el {fecha}. Paga rapido en la "
            "app Mibanco y evita recargos. Cualquier consulta escribe a tu asesora {Asesor}."
        ),
        asesor={"nombre": "Milagros Quispe", "telefono": ""},
        estados=_estados(p1="ok", p2="ok", p3="ok", p4="ok", p5="ok"),
        feedbackPaso2={"fallos": [], "principios": [], "contenidoCorregido": ""},
        feedbackPaso4={"ok": True, "observaciones": [], "sugerencias": [], "contenidoCorregido": ""},
        aprobadoCX=True, publicado=True,
        historial=[
            {"ts": _ts(18, "09:00"), "actor": "sistema", "accion": "Solicitud recibida (Paso 1)"},
            {"ts": _ts(18, "09:02"), "actor": "Agente IA", "accion": "Redaccion aprobada (Paso 2)"},
            {"ts": _ts(18, "09:03"), "actor": "Agente IA", "accion": "Sin imagenes, paso aprobado (Paso 3)"},
            {"ts": _ts(18, "09:05"), "actor": "Agente IA", "accion": "Sin riesgos legales (Paso 4)"},
            {"ts": _ts(18, "09:07"), "actor": "sistema", "accion": "Aprobacion automatica por IA (Paso 5)"},
            {"ts": _ts(18, "09:45"), "actor": "sistema", "accion": "Comunicacion publicada"},
        ],
    )

    # SOL-005 — Email con observaciones legales + revisión humana (hace 7 días)
    s5 = _base(
        id=nuevo_id(), titulo="Oferta ampliacion linea de credito",
        remitente="Pedro Soto", fecha=_fecha(7), fechaCreacion=_ts(7, "11:00"),
        area="Productos", tipo="Email",
        contenido=(
            "Hola {Nombre}, tenemos una oferta exclusiva para ti. Amplia tu linea de credito "
            "hasta S/50,000 con una tasa preferencial garantizada del 0% los primeros 3 meses "
            "sin ningun costo adicional. Oferta valida solo hasta el viernes. "
            "Llama ya a tu asesor {Asesor}."
        ),
        asesor={"nombre": "Julio Mamani", "telefono": ""},
        estados=_estados(p1="ok", p2="ok", p3="ok", p4="obs"),
        feedbackPaso2={"fallos": [], "principios": [], "contenidoCorregido": ""},
        feedbackPaso4={
            "ok": False,
            "observaciones": [
                "Promesa de tasa 0% garantizada sin respaldo documental verificable",
                "Posible incumplimiento Res. SBS 3274-2017 sobre publicidad financiera enganosa",
                "Urgencia artificial - oferta valida solo hasta el viernes - practica cuestionable segun INDECOPI",
                "Monto especifico S/50,000 sin mencionar condiciones ni requisitos",
            ],
            "sugerencias": [
                "Retirar la promesa de tasa 0% o agregar asterisco con condiciones completas",
                "Eliminar el plazo de urgencia artificial",
                "Agregar referencia a terminos y condiciones aplicables",
                "Mencionar que la ampliacion esta sujeta a evaluacion",
            ],
            "contenidoCorregido": "",
        },
        requiereRevisionHumana=True, tipoRiesgo="oferta comercial",
        historial=[
            {"ts": _ts(7, "11:00"), "actor": "sistema", "accion": "Solicitud recibida (Paso 1)"},
            {"ts": _ts(7, "11:02"), "actor": "Agente IA", "accion": "Redaccion aprobada (Paso 2)"},
            {"ts": _ts(7, "11:03"), "actor": "Agente IA", "accion": "Sin imagenes, paso aprobado (Paso 3)"},
            {"ts": _ts(7, "11:05"), "actor": "Agente IA", "accion": "Observaciones legales detectadas (Paso 4)"},
        ],
    )

    # SOL-006 — SMS en proceso, agente redacción activo (hace 2 días)
    s6 = _base(
        id=nuevo_id(), titulo="Campana cobranza cuota vencida",
        remitente="Luis Mendoza", fecha=_fecha(2), fechaCreacion=_ts(2, "15:30"),
        area="Negocios", tipo="SMS",
        contenido=(
            "MIBANCO: Su cuota de S/320 vencio el 01/06. Regularice su pago para evitar "
            "reportes a centrales de riesgo. Llame al 0800-00-900."
        ),
        asesor={"nombre": "Sandra Ccopa", "telefono": ""},
        estados=_estados(p1="ok", p2="proc"),
        historial=[
            {"ts": _ts(2, "15:30"), "actor": "sistema", "accion": "Solicitud recibida (Paso 1)"},
            {"ts": _ts(2, "15:32"), "actor": "Agente IA", "accion": "Validando redaccion... (Paso 2)"},
        ],
    )

    # SOL-007 — Email aprobado y publicado (hace 25 días)
    s7 = _base(
        id=nuevo_id(), titulo="Ingresa a la App Mibanco con tu tarjeta de debito",
        remitente="MiBanco Digital", fecha=_fecha(25), fechaCreacion=_ts(25, "10:00"),
        area="Productos", tipo="Email",
        contenido=(
            "Hola {Nombre}, ahora puedes registrarte en la App Mibanco solo con tu tarjeta de "
            "debito. Acercate a tu agencia mas cercana y solicita tu acceso. Con la app puedes "
            "transferir gratis todos los dias, pagar tus prestamos sin comisiones y desembolsar "
            "tu linea de credito en minutos. Tu asesor {Asesor} te acompana en cada paso."
        ),
        asesor={"nombre": "Guia Digital", "telefono": ""},
        estados=_estados(p1="ok", p2="ok", p3="ok", p4="ok", p5="ok"),
        feedbackPaso2={"fallos": [], "principios": [], "contenidoCorregido": ""},
        feedbackPaso4={"ok": True, "observaciones": [], "sugerencias": [], "contenidoCorregido": ""},
        aprobadoCX=True, publicado=True,
        historial=[
            {"ts": _ts(25, "10:00"), "actor": "sistema", "accion": "Solicitud recibida (Paso 1)"},
            {"ts": _ts(25, "10:02"), "actor": "Agente IA", "accion": "Redaccion aprobada (Paso 2)"},
            {"ts": _ts(25, "10:03"), "actor": "Agente IA", "accion": "Sin imagenes, paso aprobado (Paso 3)"},
            {"ts": _ts(25, "10:05"), "actor": "Agente IA", "accion": "Sin riesgos legales (Paso 4)"},
            {"ts": _ts(25, "10:07"), "actor": "sistema", "accion": "Aprobacion automatica por IA (Paso 5)"},
            {"ts": _ts(25, "10:30"), "actor": "sistema", "accion": "Comunicacion publicada"},
        ],
    )

    # SOL-008 — Email revisión humana por reclamo (hace 1 día)
    s8 = _base(
        id=nuevo_id(), titulo="Respuesta a cliente por cobro indebido",
        remitente="Carmen Flores", fecha=_fecha(1), fechaCreacion=_ts(1, "09:45"),
        area="Negocios", tipo="Email",
        contenido=(
            "Estimado cliente, en respuesta a su reclamo por el cobro indebido registrado en "
            "su cuenta, le informamos que hemos iniciado una investigacion interna que tomara "
            "un plazo de 30 dias habiles segun normativa vigente. Lamentamos los inconvenientes "
            "ocasionados."
        ),
        asesor={"nombre": "Walter Rios", "telefono": ""},
        estados=_estados(p1="ok", p2="obs"),
        feedbackPaso2={
            "fallos": [
                "Lenguaje muy formal y distante para un cliente que ya esta molesto",
                "Sin nombre del cliente - impersonal",
                "Sin nombre del asesor responsable del caso",
                "No especifica proximos pasos concretos para el cliente",
                "Plazo de 30 dias sin explicar que pasara en ese tiempo",
            ],
            "principios": [
                "Lenguaje simple y cercano",
                "Personalizado con datos del cliente y asesor",
                "Facil de actuar - que debe hacer el cliente",
            ],
            "contenidoCorregido": (
                "Hola {Nombre}, recibimos tu reclamo sobre el cobro en tu cuenta. Ya iniciamos "
                "la revision y te avisaremos en 30 dias. Tu asesor {Asesor} te mantendra "
                "informado. Gracias por tu paciencia."
            ),
        },
        requiereRevisionHumana=True, tipoRiesgo="reclamo",
        historial=[
            {"ts": _ts(1, "09:45"), "actor": "sistema", "accion": "Solicitud recibida (Paso 1)"},
            {"ts": _ts(1, "09:47"), "actor": "Agente IA", "accion": "Observaciones en redaccion (Paso 2)"},
            {"ts": _ts(1, "09:47"), "actor": "sistema", "accion": "Marcada para revision humana obligatoria por reclamo detectado"},
        ],
    )

    # SOL-009 — Pieza visual con observaciones de marca (hace 5 días)
    s9 = _base(
        id=nuevo_id(), titulo="Banner digital campana fin de anno",
        remitente="Rosa Huanca", fecha=_fecha(5), fechaCreacion=_ts(5, "11:30"),
        area="Digital", tipo="Pieza visual",
        contenido="Cierra el anno con mas ahorros. Abre tu cuenta Mibanco hoy y gana premios.",
        asesor={"nombre": "Fernando Leiva", "telefono": ""},
        estados=_estados(p1="ok", p2="ok", p3="obs"),
        feedbackPaso2={"fallos": [], "principios": [], "contenidoCorregido": ""},
        imagenes=[{
            "id": "img-seed-009",
            "storageId": "img-seed-009",
            "nombre": "banner_fin_anio.png",
            "gcsPath": None,
            "url": None,
            "mime": "image/png",
            "validada": True,
            "ok": False,
            "resultado": "Incumplimiento de Manual de Marca",
            "detalle": "Verde #00CC44 no corresponde al institucional #00964B. Logo mal ubicado.",
            "observaciones": [
                "El verde usado en el banner es #00CC44 - no corresponde al verde oficial Mibanco #00964B",
                "El logo aparece en la esquina inferior izquierda - segun manual debe ir en esquina inferior derecha",
                "El texto principal supera el area de seguridad del banner",
            ],
            "sugerencias": [
                "Corregir el verde a #00964B segun Manual de Marca v02",
                "Reubicar el logo a esquina inferior derecha",
                "Reducir el texto o ajustar al area de seguridad",
            ],
        }],
        historial=[
            {"ts": _ts(5, "11:30"), "actor": "sistema", "accion": "Solicitud recibida (Paso 1)"},
            {"ts": _ts(5, "11:32"), "actor": "Agente IA", "accion": "Redaccion aprobada (Paso 2)"},
            {"ts": _ts(5, "11:35"), "actor": "Agente IA", "accion": "Observaciones de marca en imagen (Paso 3)"},
        ],
    )

    # SOL-010 — SMS aprobado y publicado (hace 30 días)
    s10 = _base(
        id=nuevo_id(), titulo="Confirmacion de desembolso de credito",
        remitente="Pedro Soto", fecha=_fecha(30), fechaCreacion=_ts(30, "14:00"),
        area="Digital", tipo="SMS",
        contenido=(
            "Hola {Nombre}, tu credito de S/{monto} fue desembolsado hoy. Revisa tu cuenta "
            "en la app Mibanco. Cualquier duda llama a tu asesora {Asesor}."
        ),
        asesor={"nombre": "Nelly Condori", "telefono": ""},
        estados=_estados(p1="ok", p2="ok", p3="ok", p4="ok", p5="ok"),
        feedbackPaso2={"fallos": [], "principios": [], "contenidoCorregido": ""},
        feedbackPaso4={"ok": True, "observaciones": [], "sugerencias": [], "contenidoCorregido": ""},
        aprobadoCX=True, publicado=True,
        historial=[
            {"ts": _ts(30, "14:00"), "actor": "sistema", "accion": "Solicitud recibida (Paso 1)"},
            {"ts": _ts(30, "14:02"), "actor": "Agente IA", "accion": "Redaccion aprobada (Paso 2)"},
            {"ts": _ts(30, "14:03"), "actor": "Agente IA", "accion": "Sin imagenes, paso aprobado (Paso 3)"},
            {"ts": _ts(30, "14:05"), "actor": "Agente IA", "accion": "Sin riesgos legales (Paso 4)"},
            {"ts": _ts(30, "14:07"), "actor": "sistema", "accion": "Aprobacion automatica por IA (Paso 5)"},
            {"ts": _ts(30, "14:30"), "actor": "sistema", "accion": "Comunicacion publicada"},
        ],
    )

    # SOL-011 — Email revisión humana por comunicación de crisis (hace 4 días)
    s11 = _base(
        id=nuevo_id(), titulo="Comunicado por cierre temporal de agencias",
        remitente="Gestion de Crisis", fecha=_fecha(4), fechaCreacion=_ts(4, "08:00"),
        area="Negocios", tipo="Email",
        contenido=(
            "Estimados clientes, debido al fenomeno del nino que afecta la region norte del "
            "pais, informamos que nuestras agencias de Piura, Tumbes y Sullana estaran cerradas "
            "del 15 al 20 de junio. Pueden realizar sus operaciones por la app Mibanco o "
            "llamando al 0800-00-900 sin costo."
        ),
        asesor={"nombre": "Equipo Mibanco", "telefono": ""},
        estados=_estados(p1="ok", p2="obs"),
        feedbackPaso2={
            "fallos": [
                "Lenguaje formal - en crisis el tono debe ser mas calido y empatico",
                "Sin reconocimiento del impacto al cliente",
                "No especifica que pasa con los pagos y cuotas durante el cierre",
            ],
            "principios": [
                "Lenguaje simple y cercano - especialmente en crisis",
                "Mensaje claro con alternativas concretas",
            ],
            "contenidoCorregido": (
                "Hola {Nombre}, sabemos que el fenomeno del nino esta siendo dificil. Nuestras "
                "agencias de Piura, Tumbes y Sullana cerraran del 15 al 20 de junio. Sigue "
                "usando la app Mibanco o llamanos al 0800-00-900 gratis. Estamos contigo."
            ),
        },
        requiereRevisionHumana=True, tipoRiesgo="crisis",
        historial=[
            {"ts": _ts(4, "08:00"), "actor": "sistema", "accion": "Solicitud recibida (Paso 1)"},
            {"ts": _ts(4, "08:03"), "actor": "Agente IA", "accion": "Observaciones en redaccion (Paso 2)"},
            {"ts": _ts(4, "08:03"), "actor": "sistema", "accion": "Marcada para revision humana obligatoria por comunicacion de crisis"},
        ],
    )

    # SOL-012 — WhatsApp corrección aceptada, legal en proceso (hace 6 días)
    s12 = _base(
        id=nuevo_id(), titulo="Invitacion a taller de educacion financiera",
        remitente="Ana Torres", fecha=_fecha(6), fechaCreacion=_ts(6, "10:00"),
        area="Negocios", tipo="WhatsApp",
        contenido=(
            "Estimado empresario, le invitamos a participar en nuestro taller de educacion "
            "financiera que se realizara el proximo sabado 22 de junio a las 10am en nuestra "
            "agencia principal. Su asistencia es importante para su desarrollo empresarial."
        ),
        contenidoActual=(
            "Hola {Nombre}, te invitamos a nuestro taller gratuito de finanzas el sabado "
            "22 de junio a las 10am en tu agencia Mibanco. Aprende a hacer crecer tu negocio. "
            "Confirma con tu asesora {Asesor}."
        ),
        asesor={"nombre": "Patricia Salas", "telefono": ""},
        estados=_estados(p1="ok", p2="ok", p3="ok", p4="proc"),
        feedbackPaso2={
            "fallos": [
                "Lenguaje formal - usar tu en vez de le",
                "No menciona que el taller es gratuito",
                "CTA poco claro - como confirma la asistencia",
            ],
            "principios": ["Lenguaje simple y cercano", "CTA claro"],
            "contenidoCorregido": (
                "Hola {Nombre}, te invitamos a nuestro taller gratuito de finanzas el sabado "
                "22 de junio a las 10am en tu agencia Mibanco. Aprende a hacer crecer tu negocio. "
                "Confirma con tu asesora {Asesor}."
            ),
        },
        feedbackPaso3=[],
        historial=[
            {"ts": _ts(6, "10:00"), "actor": "sistema", "accion": "Solicitud recibida (Paso 1)"},
            {"ts": _ts(6, "10:03"), "actor": "Agente IA", "accion": "Observaciones en redaccion (Paso 2)"},
            {"ts": _ts(6, "10:15"), "actor": "Solicitante", "accion": "Acepto correccion de la IA (Paso 2)"},
            {"ts": _ts(6, "10:17"), "actor": "Agente IA", "accion": "Redaccion aprobada tras correccion (Paso 2)"},
            {"ts": _ts(6, "10:18"), "actor": "Agente IA", "accion": "Sin imagenes, paso aprobado (Paso 3)"},
            {"ts": _ts(6, "10:20"), "actor": "Agente IA", "accion": "Validando cumplimiento legal... (Paso 4)"},
        ],
    )

    for s in [s1, s2, s3, s4, s5, s6, s7, s8, s9, s10, s11, s12]:
        STORE[s["id"]] = s
    return STORE
