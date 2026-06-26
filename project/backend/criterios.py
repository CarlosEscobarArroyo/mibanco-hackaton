"""
Criterios y principios de validación de Mibanco.

Base de conocimiento CONFIGURABLE sin tocar el código de los agentes IA.
Fuentes:
  - Manual de Marca Mibanco v02 (mar-2022): tono, vocabulario, emojis, estilo.
  - Normativa peruana aplicable (SBS / INDECOPI / protección al consumidor y datos).
  - Biblioteca de Ejemplos "Progreso IA": 80 casos clasificados en
    4 canales (SMS, WhatsApp, Email, Push) x 4 niveles de severidad.

Cambia aquí los principios, la voz de marca, las reglas por canal, las normas
o el branding y los agentes IA los usarán automáticamente.
"""

# ---------------------------------------------------------------------------
# Público objetivo
# ---------------------------------------------------------------------------
PUBLICO_OBJETIVO = (
    "Microempresarios y emprendedores peruanos, edad promedio ~42 años, con "
    "estudios secundarios o técnicos, baja formalización y cierta desconfianza al "
    "sistema financiero. Necesitan mensajes simples, claros, cercanos y confiables. "
    "Trátalos SIEMPRE como 'emprendedores'; NUNCA los etiquetes como 'gente de bajos "
    "ingresos', 'informales', 'base de la pirámide' ni términos similares."
)

# ---------------------------------------------------------------------------
# Pilares de marca / principios de comunicación
# ---------------------------------------------------------------------------
PILARES_MARCA = [
    "Asesoramos: orientamos y damos opciones; no presionamos ni ordenamos.",
    "Cuidamos: protegemos al cliente, su dinero y sus datos.",
    "Cooperamos: hablamos como comunidad y aliado del progreso del cliente.",
    "Innomejoramos: aportamos información y herramientas de valor.",
    "Espiral de Progreso: reconocemos y celebramos cada avance del cliente.",
]

# ---------------------------------------------------------------------------
# Voz y tono de marca (Manual de Marca Mibanco v02)
# ---------------------------------------------------------------------------
VOZ_MARCA = [
    "Habla en segunda persona del singular ('tú', 'tu'); NUNCA uses 'usted'.",
    "Tono cercano, humano y empoderador; nunca distante, corporativo ni burocrático.",
    "Personaliza con el nombre del cliente cuando sea posible (usa el placeholder {Nombre}).",
    "Máximo 2 emojis por pieza, siempre pertinentes al contexto.",
    "Sin MAYÚSCULAS sostenidas ni signos de exclamación/interrogación múltiples ('!!!', '¿¿').",
    "Traduce la jerga financiera (TCEA, TREA, TEA, 'tarifario', 'parámetros vigentes') a lenguaje simple.",
    "CTA claro, accionable y realizable en el canal: URL oficial (mibanco.pe) o teléfono oficial (01-311-9000); nunca 'haz clic aquí' sin enlace.",
    "Framing positivo (cuida / protege / avanza) en lugar de amenaza, pérdida o castigo.",
]

# Frases y fórmulas PROHIBIDAS por el Manual de Marca (pág. 151)
FRASES_PROHIBIDAS = [
    # tono distante / corporativo
    "Estimado cliente", "Estimada clienta", "Estimado/a", "le informamos",
    "le notificamos", "le escribimos", "mediante la presente", "la presente",
    "con detenimiento",
    # lenguaje de derrota institucional
    "No podemos", "no funcionó", "no se pudo", "no funcionará",
    "lamentablemente", "no tenemos disponibilidad",
    # tratamiento de 'usted'
    "encontrará", "inténtelo", "revisar el documento", "acceder al link",
]

# ---------------------------------------------------------------------------
# Principios de redacción (Agente 2) — versión accionable
# ---------------------------------------------------------------------------
PRINCIPIOS_REDACCION = [
    "Lenguaje simple y cercano (segunda persona, sin jerga técnica sin traducir)",
    "Mensaje claro: una sola idea principal, sin confusión",
    "Voz de marca: tono asesor y empoderador, sin frases prohibidas ni 'usted'",
    "Sin riesgos: no parece fraude, no promete de más, sin urgencia ni presión artificial",
    "Seguro y transparente: sin datos sensibles ni dudas legales",
    "Fácil de actuar: CTA claro, realizable en el canal y con orden lógico",
]

# ---------------------------------------------------------------------------
# Reglas y límites por canal/tipo de pieza
# ---------------------------------------------------------------------------
REGLAS_CANAL = {
    "SMS": (
        "Máximo 160 caracteres. Remitente 'Mibanco Oficial'. Una sola idea y un CTA "
        "claro. Usa URL oficial (mibanco.pe) o teléfono oficial (01-311-9000); nunca "
        "'haz clic aquí' sin enlace adjunto."
    ),
    "WhatsApp": (
        "Tono conversacional y cercano. Emojis con moderación (máx 2). El CTA en formato "
        "pregunta resulta más natural ('¿Quieres que te ayude?'). Incluye el canal oficial. "
        "Nunca pidas DNI, contraseñas ni datos sensibles por este canal."
    ),
    "Email": (
        "Estructura Asunto + Preheader + Cuerpo. Asunto personalizado con {Nombre}; el "
        "preheader complementa (no repite) el asunto. Segunda persona. En Email y Carta "
        "incluye los datos del Asesor de Negocios. Las ofertas de producto deben incluir "
        "TCEA/TREA y remitir al tarifario (mibanco.pe)."
    ),
    "Push": (
        "Título ≤ 50 caracteres y cuerpo ≤ 100 caracteres. Comunica un beneficio o acción "
        "concreta (no solo 'Hola'). Máx 2 emojis en total. Sin mayúsculas sostenidas."
    ),
    "Push notification": (
        "Título ≤ 50 caracteres y cuerpo ≤ 100 caracteres. Comunica un beneficio o acción "
        "concreta (no solo 'Hola'). Máx 2 emojis en total. Sin mayúsculas sostenidas."
    ),
    "Carta": (
        "Formato formal pero claro y cercano (sin lenguaje burocrático). Datos completos "
        "del cliente y de la entidad e incluye los datos del Asesor de Negocios. Lenguaje "
        "respetuoso y en segunda persona."
    ),
    "Speech": (
        "Lenguaje conversacional y natural, pensado para leerse en voz alta por un asesor. "
        "Frases cortas, sin jerga, con pausas naturales."
    ),
}

# ---------------------------------------------------------------------------
# Branding (Agente 3 - marca/imágenes)
# ---------------------------------------------------------------------------
BRANDING = {
    "verde": "#009639",
    "amarillo": "#FFC40C",
    "descripcion": (
        "El logo de Mibanco es un sol (isotipo) en amarillo dorado junto al texto 'mibanco' en verde. "
        "Los colores oficiales son el verde Mibanco (aprox. #009639) y el amarillo del sol "
        "(aprox. #FFC40C–#F8D000); son referencias, no exige un HEX exacto. El isotipo del sol puede ir "
        "en amarillo sobre fondo verde o sobre fondo claro. Las piezas deben tener el logo correcto y "
        "legible y buenas proporciones. Las fotografías de marketing y las capturas de la app contienen "
        "muchos colores naturales y eso es normal; solo se considera infracción el uso claramente "
        "equivocado del logo o de los colores de marca."
    ),
}

# ---------------------------------------------------------------------------
# Niveles de severidad (mapa de decisión) — Biblioteca Progreso IA
# Cada validación debe clasificarse en uno de estos 4 niveles.
# ---------------------------------------------------------------------------
NIVELES_SEVERIDAD = {
    "aprobado": {
        "nivel": 1, "color": "verde", "accion": "aprobar",
        "descripcion": (
            "Cumple la voz de marca, las reglas del canal y la normativa. Puede auto-aprobarse."
        ),
    },
    "observacion": {
        "nivel": 2, "color": "amarillo", "accion": "corregir",
        "descripcion": (
            "Problemas de tono, forma o canal corregibles automáticamente. Propón una versión "
            "corregida; no requiere escalamiento humano."
        ),
    },
    "alerta": {
        "nivel": 3, "color": "naranja", "accion": "escalar",
        "descripcion": (
            "Riesgo normativo o reputacional. Requiere revisión humana (Compliance / Legal / "
            "Especialista CX). Sugiere una mejora pero NO se auto-aprueba."
        ),
    },
    "critico": {
        "nivel": 4, "color": "rojo", "accion": "bloquear",
        "descripcion": (
            "Infracción grave: datos sensibles expuestos, phishing, cobranza coercitiva, "
            "discriminación o promesa imposible. BLOQUEAR: no publicar. Varios casos NO son "
            "auto-corregibles y exigen rediseño desde cero con Legal / Compliance / Seguridad."
        ),
    },
}

# ---------------------------------------------------------------------------
# Normativa aplicable (para citar en la validación legal)
# ---------------------------------------------------------------------------
NORMAS = {
    "SBS_3274_2017": (
        "Res. SBS N° 3274-2017 — Transparencia financiera: obliga a informar TCEA/TREA y "
        "remitir al tarifario en ofertas de producto."
    ),
    "DL_1044": (
        "D.L. N° 1044 (INDECOPI) — Competencia desleal y publicidad engañosa: prohíbe claims "
        "sin sustento, superlativos no comprobados y estadísticas no verificadas."
    ),
    "LEY_32323": (
        "Ley N° 32323 — Prohibición de comunicaciones no solicitadas (anti-spam): exige "
        "consentimiento para ciertos envíos y usos de datos de comportamiento."
    ),
    "LEY_29571": (
        "Ley N° 29571 — Código de Protección y Defensa del Consumidor (Art. 61): prohíbe la "
        "cobranza abusiva, coercitiva o con amenazas."
    ),
    "LEY_29733": (
        "Ley N° 29733 — Protección de Datos Personales: prohíbe exponer datos sensibles (DNI, "
        "número de cuenta, CCI, saldo) por canales de mensajería."
    ),
    "SBS_504_2021": (
        "Res. SBS N° 504-2021 — Ciberseguridad e información confidencial."
    ),
    "MANUAL_MARCA": (
        "Manual de Marca Mibanco v02 (mar-2022) — Tono, vocabulario, emojis y estilo."
    ),
}

# ---------------------------------------------------------------------------
# Patrones que disparan BLOQUEO (nivel crítico/rojo)
# ---------------------------------------------------------------------------
PATRONES_BLOQUEO = [
    "Datos personales o financieros sensibles en el canal: DNI, número de cuenta, CCI, "
    "saldo, PIN o contraseña (Ley 29733 / Res. SBS 504-2021).",
    "Solicitar credenciales (DNI, PIN, contraseña, datos de cuenta) por SMS/WhatsApp/Email/"
    "Push: patrón de phishing. Mibanco nunca pide contraseñas ni PIN por ningún canal.",
    "URLs no oficiales o acortadores (bit.ly, dominios distintos de mibanco.pe): posible "
    "phishing o suplantación de la marca.",
    "Cobranza coercitiva o amenazante: 'acciones legales', 'reporte/boletín de deudores', "
    "plazos arbitrarios de horas (Ley 29571 Art. 61).",
    "Promesas imposibles para un banco regulado: 'aprobación garantizada', '100%', 'sin "
    "importar tu historial', 'duplicar tus ingresos', 'la mejor tasa del mercado'.",
    "'GRATIS' / 'sin intereses' / 'sin cargos' en productos que tienen TCEA, sin especificar "
    "condiciones (publicidad engañosa, Res. SBS 3274-2017 + D.L. 1044).",
    "Discriminación o exclusión explícita por género, zona geográfica o condición laboral "
    "(la segmentación se gestiona en CRM, nunca se explicita en el mensaje al cliente).",
]

# ---------------------------------------------------------------------------
# Patrones que disparan ALERTA (nivel naranja) — requieren revisión humana
# ---------------------------------------------------------------------------
PATRONES_ALERTA = [
    "Claims sin sustento o superlativos ('beneficios exclusivos', 'la mejor tasa', 'tasas "
    "especiales') sin evidencia ni comparativa verificable.",
    "Estadísticas no verificadas ('el 80% de las emprendedoras...').",
    "Urgencia artificial o presión comercial ('solo hoy', 'última oportunidad', 'actúa ahora').",
    "'Pre-aprobado' que puede crear expectativa vinculante: preferir 'pre-evaluado positivamente'.",
    "Falta de TCEA/TREA o de referencia al tarifario en una oferta de producto (Res. SBS 3274-2017).",
    "Uso de datos de comportamiento del cliente sin consentimiento verificado (Ley 32323).",
    "Mensajes de seguridad o de actualización de datos que deben coordinarse con el área "
    "responsable (Seguridad/Ciberseguridad) antes de enviarse.",
    "Comparación social que pueda generar ansiedad ('tu vecino ya ahorró...', 'no te quedes atrás').",
    "Referencias a programas que pueden estar vencidos o inexistentes (p. ej. Reactiva Perú).",
]

# Instrucción para casos que la IA NO debe intentar auto-corregir
CASOS_NO_AUTOCORREGIBLE = (
    "Cuando la premisa misma del mensaje es ilícita o imposible (p. ej. 'duplicar ingresos "
    "garantizado', 'crédito sin evaluar historial', exposición de datos sensibles, amenazas "
    "de cobranza), NO inventes una versión 'corregida' que mantenga esa promesa. Marca nivel "
    "'critico', acción 'bloquear' y explica que requiere rediseño desde cero con el área "
    "responsable. Solo entrega 'contenido_corregido' cuando exista una versión realmente válida."
)

# ---------------------------------------------------------------------------
# Keywords que fuerzan REVISIÓN HUMANA OBLIGATORIA
# (reclamos, crisis coyunturales u ofertas comerciales no se auto-aprueban en pasos IA)
# ---------------------------------------------------------------------------
KEYWORDS_REVISION_HUMANA = [
    # Reclamos
    "reclamo", "reclamos", "queja", "quejas", "demanda", "indecopi", "disconforme",
    "denuncia", "insatisfecho", "insatisfecha", "mal servicio", "mala atencion",
    "incumplimiento", "perjuicio", "error del banco", "cobro indebido",
    # Crisis
    "crisis", "fraude", "estafa", "robo", "hackeo", "hackearon", "phishing",
    "emergencia", "urgente nacional", "brecha", "filtracion", "fuga de datos",
    "fenomeno del nino", "desastre natural", "pandemia",
    "suspension de servicios", "cierre de agencias", "caso fortuito", "fuerza mayor",
    # Ofertas comerciales (terminos que indican una oferta, no menciones neutrales)
    "oferta", "ofertas", "oferta especial", "oferta de credito",
    "promocion", "promo", "descuento", "descuentos",
    "gratis", "regalo", "sorteo", "premio", "% dscto", "% de descuento",
    "credito pre-aprobado", "prestamo pre-aprobado", "tasa especial", "tasa preferencial",
    "producto financiero", "seguro mibanco", "financiamiento especial",
    "linea de credito disponible", "capital de trabajo disponible",
    # Cobranza sensible
    "cobranza", "mora", "deuda vencida", "accion legal", "acciones legales",
]
