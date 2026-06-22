"""
Criterios y principios de validación de Mibanco.

Estos valores son CONFIGURABLES sin tocar el código de los agentes IA.
Cambia aquí los principios, reglas por canal o el branding y los agentes
los usarán automáticamente.
"""

# Público objetivo de Mibanco (banco peruano para microempresarios)
PUBLICO_OBJETIVO = (
    "Microempresarios peruanos, edad promedio ~42 años, con estudios secundarios o "
    "técnicos, baja formalización y cierta desconfianza al sistema financiero. "
    "Necesitan mensajes simples, claros, cercanos y confiables."
)

# Principios de redacción (Agente 2)
PRINCIPIOS_REDACCION = [
    "Lenguaje simple y cercano",
    "Mensaje claro, sin confusión",
    "Sin riesgos: no parece fraude, no promete de más",
    "Seguro y transparente: sin datos sensibles ni dudas legales",
    "Fácil de actuar: CTA claro y orden lógico",
]

# Reglas por canal/tipo de pieza
REGLAS_CANAL = {
    "SMS": "Máximo 160 caracteres. Remitente 'Mibanco Oficial'. Directo, una sola idea y CTA claro.",
    "WhatsApp": "Tono corto y cercano. Puede usar emojis con moderación. Incluir canal oficial.",
    "Email": "Saludo y personalización ({Nombre}). Debe incluir los datos del Asesor de Negocios. Estructura clara.",
    "Push": "Título corto (máx ~40 caracteres) y cuerpo breve (máx ~120 caracteres).",
    "Push notification": "Título corto (máx ~40 caracteres) y cuerpo breve (máx ~120 caracteres).",
    "Carta": "Formal pero claro. Datos completos del cliente y de la entidad. Lenguaje respetuoso.",
    "Speech": "Lenguaje conversacional y natural, pensado para ser leído en voz alta por un asesor.",
}

# Descripción del branding (Agente 3 - marca/imágenes)
BRANDING = {
    "verde": "#009639",
    "amarillo": "#FFC40C",
    "descripcion": (
        "El logo de Mibanco es un sol (isotipo) en amarillo institucional (#FFC40C). "
        "Los colores oficiales de la marca son el verde Mibanco (#009639) y el amarillo "
        "(#FFC40C). El isotipo del sol normalmente va en amarillo sobre fondo verde. "
        "Las piezas gráficas deben respetar la paleta oficial, mantener buenas proporciones, "
        "ser legibles y estar correctamente alineadas con la identidad de marca. "
        "No se permiten verdes o amarillos fuera de paleta, ni logos distorsionados."
    ),
}

# Keywords que fuerzan REVISIÓN HUMANA OBLIGATORIA
# (reclamos, crisis coyunturales u ofertas comerciales no se auto-aprueban en pasos IA)
KEYWORDS_REVISION_HUMANA = [
    # Reclamos
    "reclamo", "reclamos", "queja", "quejas", "demanda", "indecopi", "disconforme",
    # Crisis
    "crisis", "fraude", "estafa", "robo", "hackeo", "hackearon", "emergencia", "urgente nacional",
    # Ofertas comerciales
    "oferta", "ofertas", "promoción", "promocion", "promo", "descuento", "descuentos",
    "gratis", "regalo", "sorteo", "premio", "% dscto", "% de descuento",
]
