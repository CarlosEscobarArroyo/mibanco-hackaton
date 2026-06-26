"""
Agentes IA basados en Gemini (Vertex AI).

Autenticación por Application Default Credentials (ADC) / service account de Cloud Run.
NO se usan API keys. Configuración por variables de entorno:
  GOOGLE_CLOUD_PROJECT, GOOGLE_CLOUD_LOCATION, GEMINI_MODEL.

Agentes:
  1. clasificar          -> detecta reclamo/crisis/oferta -> revisión humana obligatoria
  2. validar_redaccion   -> voz de marca, tono, claridad, formato por canal (Redactor/Brand Guardian)
  3. validar_imagen      -> branding visual (multimodal, Agente Brand)
  4. validar_legal       -> normativa peruana, riesgos, datos sensibles (Compliance/Legal/Seguridad)
  5. generar_brief       -> resumen ejecutivo para CX

Todos los criterios (voz de marca, frases prohibidas, reglas por canal, niveles de
severidad, normas y patrones de bloqueo) viven en criterios.py y se inyectan en los
prompts. Las validaciones clasifican cada pieza en 4 niveles de severidad:
  aprobado (verde) | observacion (amarillo) | alerta (naranja) | critico (rojo)
mapeados a las acciones aprobar | corregir | escalar | bloquear.
Compatibilidad: 'cumple' (bool) sigue siendo el contrato con service.py; 'nivel',
'accion' y 'normas' son campos adicionales no destructivos.
"""
import json
import os

import criterios

PROJECT = os.getenv("GOOGLE_CLOUD_PROJECT", "")
LOCATION = os.getenv("GOOGLE_CLOUD_LOCATION", "us-central1")
MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

_client = None


def client():
    global _client
    if _client is None:
        from google import genai
        _client = genai.Client(vertexai=True, project=PROJECT, location=LOCATION)
    return _client


def _config(system_instruction: str, json_mode: bool = True, temperature: float = 0.2):
    from google.genai import types
    kwargs = dict(system_instruction=system_instruction, temperature=temperature)
    if json_mode:
        kwargs["response_mime_type"] = "application/json"
    return types.GenerateContentConfig(**kwargs)


def _parse_json(text: str, default: dict) -> dict:
    if not text:
        return default
    t = text.strip()
    if t.startswith("```"):
        # quita fences ```json ... ```
        t = t.strip("`")
        if t.lower().startswith("json"):
            t = t[4:]
        t = t.strip()
    try:
        data = json.loads(t)
        return data if isinstance(data, dict) else default
    except Exception:
        return default


def _ctx_marca() -> str:
    return (
        f"Mibanco es un banco peruano enfocado en microempresarios. "
        f"Público objetivo: {criterios.PUBLICO_OBJETIVO}"
    )


def _bullets(items) -> str:
    """Convierte una lista en viñetas '- ...' para inyectar en el prompt."""
    return "\n".join(f"- {x}" for x in items)


def _voz_marca_txt() -> str:
    return (
        "VOZ Y TONO DE MARCA (Manual de Marca Mibanco v02 — obligatorio):\n"
        f"{_bullets(criterios.VOZ_MARCA)}\n"
        "PILARES DE MARCA (refléjalos en el mensaje cuando aplique):\n"
        f"{_bullets(criterios.PILARES_MARCA)}\n"
        "FRASES Y FÓRMULAS PROHIBIDAS (si aparecen, hay infracción de marca): "
        f"{', '.join(criterios.FRASES_PROHIBIDAS)}."
    )


def _niveles_txt() -> str:
    lineas = []
    for clave, n in criterios.NIVELES_SEVERIDAD.items():
        lineas.append(
            f"- '{clave}' (nivel {n['nivel']}, {n['color']}, acción '{n['accion']}'): {n['descripcion']}"
        )
    return "NIVELES DE SEVERIDAD (clasifica SIEMPRE en uno):\n" + "\n".join(lineas)


def _normas_txt() -> str:
    return "NORMATIVA APLICABLE (cítala por su código cuando detectes un riesgo):\n" + _bullets(
        criterios.NORMAS.values()
    )


def _normalizar_nivel(out: dict) -> dict:
    """Normaliza 'nivel'/'accion' y deriva 'cumple' de forma coherente con la severidad.

    Mantiene la compatibilidad con el flujo: 'cumple' sigue siendo el booleano que
    consume service.py. Solo nivel='aprobado' equivale a cumple=true.
    """
    nivel = str(out.get("nivel", "")).strip().lower()
    if nivel not in criterios.NIVELES_SEVERIDAD:
        # Si el modelo no devolvió nivel válido, lo inferimos del booleano clásico.
        nivel = "aprobado" if out.get("cumple", True) else "observacion"
    meta = criterios.NIVELES_SEVERIDAD[nivel]
    out["nivel"] = nivel
    out["accion"] = meta["accion"]
    out["cumple"] = nivel == "aprobado"
    # Escalamiento humano para riesgo normativo/reputacional o bloqueo.
    out["requiere_revision_humana"] = nivel in ("alerta", "critico")
    return out


# ---------------------------------------------------------------------------
# Agente 1 — Clasificación (revisión humana obligatoria)
# ---------------------------------------------------------------------------
def clasificar(tipo: str, contenido: str) -> dict:
    sys = (
        f"{_ctx_marca()} "
        "Eres el Agente Clasificador de comunicaciones de Mibanco. Tu trabajo es identificar, ANTES "
        "de cualquier validación, si la pieza entra en una categoría sensible que NO puede auto-aprobarse. "
        "Clasifica en UNA categoría:\n"
        "- 'reclamo': gestión de reclamos, quejas, disconformidad o mención de INDECOPI.\n"
        "- 'crisis': situación coyuntural sensible — fraude, phishing, estafa, hackeo, emergencia, "
        "fuga/brecha de datos, suplantación de la marca.\n"
        "- 'oferta_comercial': promoción, descuento, oferta, sorteo, premio o cualquier comunicación "
        "publicitaria de un producto financiero.\n"
        "- 'normal': comunicación transaccional o informativa sin las características anteriores "
        "(confirmaciones, recordatorios de pago neutrales, avisos de estado).\n"
        "REGLA DURA: 'reclamo', 'crisis' y 'oferta_comercial' SIEMPRE requieren revisión humana "
        "obligatoria (requiere_revision_humana=true) y no pueden auto-aprobarse en los pasos de IA. "
        "Ejemplos: 'Tienes un crédito pre-aprobado, solicítalo hoy' -> oferta_comercial; "
        "'Tu transferencia de S/1,200 fue exitosa' -> normal; "
        "'Verifica tu cuenta en bit.ly/...' -> crisis (posible phishing). "
        "En 'motivo' explica brevemente por qué, en español. "
        "Responde SOLO JSON: {\"tipo_riesgo\": \"reclamo|crisis|oferta_comercial|normal\", "
        "\"requiere_revision_humana\": true|false, \"motivo\": \"...\"}"
    )
    prompt = f"Tipo de pieza/canal: {tipo}\nContenido:\n{contenido}"
    default = {"tipo_riesgo": "normal", "requiere_revision_humana": False, "motivo": ""}
    try:
        resp = client().models.generate_content(model=MODEL, contents=prompt, config=_config(sys, temperature=0))
        out = _parse_json(resp.text, default)
        out.setdefault("tipo_riesgo", "normal")
        out["requiere_revision_humana"] = bool(out.get("requiere_revision_humana")) or out.get("tipo_riesgo") in (
            "reclamo", "crisis", "oferta_comercial")
        return out
    except Exception as e:
        return {**default, "error": str(e)}


# ---------------------------------------------------------------------------
# Agente 2 — Validación de redacción
# ---------------------------------------------------------------------------
def validar_redaccion(tipo: str, contenido: str, asesor: dict) -> dict:
    regla = criterios.REGLAS_CANAL.get(tipo, "Mensaje claro y breve.")
    principios = "; ".join(criterios.PRINCIPIOS_REDACCION)
    sys = (
        f"Eres el Agente Redactor / Brand Guardian de Mibanco: validas el tono, la claridad y la voz "
        f"de marca de las comunicaciones. {_ctx_marca()}\n\n"
        f"{_voz_marca_txt()}\n\n"
        f"PRINCIPIOS DE REDACCIÓN: {principios}.\n"
        f"REGLA DEL CANAL '{tipo}': {regla}\n"
        "Si el canal es Email o Carta, el mensaje debe incluir los datos del Asesor de Negocios.\n\n"
        f"{_niveles_txt()}\n"
        "Cómo asignar el nivel en redacción:\n"
        "- 'aprobado': respeta voz de marca, canal y principios.\n"
        "- 'observacion': fallos de tono/forma/canal corregibles (uso de 'usted', frase prohibida, "
        ">2 emojis, mayúsculas o '!!!', exceso de caracteres, jerga sin traducir, CTA irrealizable, "
        "mensaje sin valor).\n"
        "- 'alerta'/'critico': si además hay riesgo normativo o de contenido (lo profundiza el Agente Legal); "
        "señálalo en 'fallos' aunque tu rol principal sea la redacción.\n\n"
        f"{criterios.CASOS_NO_AUTOCORREGIBLE}\n\n"
        "Cuando haya fallos corregibles, propón una versión corregida que respete TODOS los principios y "
        "la regla del canal: natural, cercana, en segunda persona, con máx 2 emojis. Usa {Nombre} y {Asesor} "
        "como placeholders cuando aplique. En cada elemento de 'fallos' nombra el problema concreto y, si "
        "corresponde, cita el 'Manual de Marca' (p. ej. \"'Estimado cliente': tono distante prohibido por "
        "Manual de Marca\").\n\n"
        "Ejemplos de referencia (canal SMS):\n"
        "- 'Estimado cliente, le informamos que su préstamo ha sido aprobado...' -> nivel 'observacion'; "
        "fallos: tono distante ('Estimado cliente'), uso de 'usted' ('le informamos'), excede 160 caracteres; "
        "corrección: 'Hola {Nombre}, tu préstamo fue aprobado. Más detalles en mibanco.pe'.\n"
        "- 'Hola Rosa, tu préstamo de S/5,000 fue aprobado. Recógelo hoy en tu agencia. Más info: mibanco.pe' "
        "-> nivel 'aprobado' (tono cercano, segunda persona, CTA claro, dentro del límite).\n\n"
        "Responde SOLO JSON con esta forma exacta: "
        "{\"cumple\": true|false, \"nivel\": \"aprobado|observacion|alerta|critico\", "
        "\"accion\": \"aprobar|corregir|escalar|bloquear\", \"fallos\": [\"...\"], "
        "\"principios_afectados\": [\"...\"], \"contenido_corregido\": \"...\"}. "
        "'cumple' es true SOLO si nivel='aprobado'. Si nivel='aprobado', 'fallos' y 'principios_afectados' "
        "van vacíos y 'contenido_corregido' es el mensaje tal cual. Si el caso no es auto-corregible, deja "
        "'contenido_corregido' igual al original y explica en 'fallos' que requiere rediseño humano. "
        "Importante: nunca uses guiones largos en tus respuestas. Usa siempre guiones cortos -. "
        "Nunca uses comillas angulares. Usa siempre comillas normales."
    )
    asesor_txt = f"{asesor.get('nombre','')} ({asesor.get('telefono','')})" if asesor else "no especificado"
    prompt = f"Canal: {tipo}\nDatos del Asesor de Negocios: {asesor_txt}\nMensaje a evaluar:\n{contenido}"
    default = {"cumple": True, "nivel": "aprobado", "accion": "aprobar", "fallos": [], "principios_afectados": [], "contenido_corregido": contenido}
    try:
        resp = client().models.generate_content(model=MODEL, contents=prompt, config=_config(sys))
        out = _parse_json(resp.text, default)
        out.setdefault("fallos", [])
        out.setdefault("principios_afectados", [])
        if not out.get("contenido_corregido"):
            out["contenido_corregido"] = contenido
        _normalizar_nivel(out)
        return out
    except Exception as e:
        return {**default, "fallos": [f"No se pudo validar con IA: {e}"], "error": str(e)}


# ---------------------------------------------------------------------------
# Agente 3 — Validación de marca / imágenes (multimodal)
# ---------------------------------------------------------------------------
def validar_imagen(img_bytes: bytes, mime_type: str, nombre: str) -> dict:
    from google.genai import types
    sys = (
        "Eres el Agente Brand de Mibanco, validador de identidad visual de marca. "
        "Tu criterio es APROBAR las piezas que respetan la identidad de Mibanco y marcar como "
        "incumplimiento SOLO los problemas de marca claros y graves.\n\n"
        f"Identidad de marca: {criterios.BRANDING['descripcion']}\n\n"
        "QUÉ NO ES INFRACCIÓN (se APRUEBA, cumple=true):\n"
        "- Fotografías de marketing con colores naturales: personas, piel, ropa (p. ej. mandiles "
        "naranjas), productos, tarjetas, fondos y escenas reales. Una foto tiene muchos colores y es correcto.\n"
        "- Capturas de pantalla de la App Mibanco, degradados, fondos blancos o claros.\n"
        "- Variaciones leves de tono por compresión o render: NO exijas un HEX exacto; tonos cercanos "
        "al verde o amarillo de marca son válidos.\n"
        "- El logo/isotipo oficial (sol amarillo + 'mibanco' en verde) y los footers verdes de marca.\n\n"
        "MARCA cumple=false SOLO si hay un problema evidente y serio, por ejemplo:\n"
        "- El logo o isotipo de Mibanco aparece en colores claramente equivocados (p. ej. azul o rojo), "
        "distorsionado, estirado, pixelado o recortado.\n"
        "- Aparece el branding de otra marca o de un competidor, o el texto de marca es ilegible.\n"
        "- El diseño usa de forma dominante un esquema de color claramente ajeno a la marca en sus elementos de marca.\n\n"
        "Ante la duda, APRUEBA (cumple=true). No corrijas la imagen, solo evalúa. En 'observaciones' "
        "describe únicamente incumplimientos graves y concretos; en 'sugerencias', la acción de diseño. "
        "Responde SOLO JSON: {\"cumple\": true|false, \"observaciones\": [\"...\"], \"sugerencias\": [\"...\"]}"
    )
    default = {"cumple": True, "observaciones": [], "sugerencias": []}
    try:
        contents = [
            types.Part.from_bytes(data=img_bytes, mime_type=mime_type or "image/png"),
            f"Nombre del archivo: {nombre}. Evalúa si esta imagen cumple el branding de Mibanco.",
        ]
        resp = client().models.generate_content(model=MODEL, contents=contents, config=_config(sys))
        out = _parse_json(resp.text, default)
        out.setdefault("cumple", True)
        out.setdefault("observaciones", [])
        out.setdefault("sugerencias", [])
        return out
    except Exception as e:
        return {**default, "cumple": False, "observaciones": [f"No se pudo validar la imagen con IA: {e}"], "error": str(e)}


# ---------------------------------------------------------------------------
# Agente 4 — Validación legal y cumplimiento
# ---------------------------------------------------------------------------
def validar_legal(contenido: str, tipo: str = "") -> dict:
    sys = (
        f"Eres el Agente Compliance / Legal de Mibanco (apoyado por el Auditor de Seguridad). {_ctx_marca()}\n\n"
        f"{_normas_txt()}\n\n"
        "PATRONES DE BLOQUEO AUTOMÁTICO (nivel 'critico' — NO publicar bajo ninguna circunstancia):\n"
        f"{_bullets(criterios.PATRONES_BLOQUEO)}\n\n"
        "PATRONES DE ALERTA (nivel 'alerta' — requieren revisión humana de Compliance/Legal/CX):\n"
        f"{_bullets(criterios.PATRONES_ALERTA)}\n\n"
        f"{_niveles_txt()}\n\n"
        f"{criterios.CASOS_NO_AUTOCORREGIBLE}\n\n"
        "Revisa el mensaje y, en cada elemento de 'observaciones', describe el riesgo y CITA la norma "
        "aplicable (p. ej. \"Exposición de DNI en SMS — Ley 29733 + Res. SBS 504-2021\", o "
        "\"'la mejor tasa del mercado' es superlativo sin sustento — D.L. 1044\"). "
        "En 'sugerencias' indica la acción concreta (corregir / escalar a Compliance / escalar a Legal / "
        "bloquear y escalar a Ciberseguridad). "
        "Si el caso es 'observacion' o un 'alerta' reformulable, propón en 'contenido_corregido' una versión "
        "que resuelva el riesgo (incluye TCEA/TREA y remite al tarifario cuando sea oferta de producto). "
        "Si es 'critico' o no auto-corregible, deja 'contenido_corregido' igual al original.\n\n"
        "Responde SOLO JSON: {\"cumple\": true|false, \"nivel\": \"aprobado|observacion|alerta|critico\", "
        "\"accion\": \"aprobar|corregir|escalar|bloquear\", \"observaciones\": [\"...\"], "
        "\"sugerencias\": [\"...\"], \"normas\": [\"...\"], \"contenido_corregido\": \"...\"}. "
        "'cumple' es true SOLO si nivel='aprobado'. "
        "Importante: nunca uses guiones largos en tus respuestas. Usa siempre guiones cortos -. "
        "Nunca uses comillas angulares. Usa siempre comillas normales."
    )
    prompt = f"Canal: {tipo}\nMensaje a revisar:\n{contenido}"
    default = {"cumple": True, "nivel": "aprobado", "accion": "aprobar", "observaciones": [], "sugerencias": [], "normas": [], "contenido_corregido": contenido}
    try:
        resp = client().models.generate_content(model=MODEL, contents=prompt, config=_config(sys))
        out = _parse_json(resp.text, default)
        out.setdefault("observaciones", [])
        out.setdefault("sugerencias", [])
        out.setdefault("normas", [])
        if not out.get("contenido_corregido"):
            out["contenido_corregido"] = contenido
        _normalizar_nivel(out)
        return out
    except Exception as e:
        return {**default, "error": str(e)}


# ---------------------------------------------------------------------------
# Agente Brief — Paso 5
# ---------------------------------------------------------------------------
def generar_brief(sol: dict) -> str:
    sys = (
        "Eres el Agente CX de Mibanco. Genera un brief ejecutivo en español (máximo 200 palabras) para "
        "que el área de CX decida con rapidez. Incluye: pieza, canal, área, versión final del mensaje y el "
        "resultado de cada validación (redacción/voz de marca, marca/imágenes y legal/compliance), indicando "
        "el nivel de severidad detectado (aprobado / observación / alerta / crítico) y la acción recomendada "
        "(aprobar / corregir / escalar / bloquear). "
        "Si hay una norma citada (SBS, INDECOPI, Ley 29733/29571/32323), menciónala brevemente. "
        "Si la solicitud requiere revisión humana obligatoria o está BLOQUEADA, indícalo de forma destacada al "
        "inicio. Tono claro y accionable. Devuelve solo el texto del brief, sin markdown ni encabezados extra. "
        "Importante: nunca uses guiones largos en tus respuestas. Usa siempre guiones cortos -. "
        "Nunca uses comillas angulares. Usa siempre comillas normales."
    )
    resumen = {
        "titulo": sol.get("titulo"),
        "canal": sol.get("tipo"),
        "area": sol.get("area"),
        "version_final": sol.get("contenidoActual"),
        "requiere_revision_humana": sol.get("requiereRevisionHumana"),
        "tipo_riesgo": sol.get("tipoRiesgo"),
        "redaccion": sol.get("estados", {}).get("paso2"),
        "feedback_redaccion": sol.get("feedbackPaso2", {}),
        "marca_imagenes": sol.get("estados", {}).get("paso3"),
        "imagenes": [{"nombre": i.get("nombre"), "resultado": i.get("resultado")} for i in sol.get("imagenes", [])],
        "legal": sol.get("estados", {}).get("paso4"),
        "feedback_legal": sol.get("feedbackPaso4", {}),
    }
    prompt = "Datos de la solicitud (JSON):\n" + json.dumps(resumen, ensure_ascii=False, indent=2)
    try:
        resp = client().models.generate_content(model=MODEL, contents=prompt, config=_config(sys, json_mode=False, temperature=0.3))
        return (resp.text or "").strip()
    except Exception as e:
        return (
            f"Brief (generación automática no disponible: {e}).\n"
            f"Pieza: {sol.get('tipo')} — {sol.get('titulo')}. Área: {sol.get('area')}.\n"
            f"Versión final: {sol.get('contenidoActual')}.\n"
            f"Redacción: {sol.get('estados',{}).get('paso2')} · "
            f"Marca: {sol.get('estados',{}).get('paso3')} · "
            f"Legal: {sol.get('estados',{}).get('paso4')}."
        )


def generar_consejo_rechazo(sol: dict) -> str:
    """Genera un mensaje constructivo de rechazo para que CX se lo envie al solicitante."""
    sys = (
        "Eres el Agente CX de Mibanco. Genera un mensaje de rechazo constructivo (maximo 150 palabras) "
        "para enviar al solicitante. El mensaje debe: explicar brevemente por que la pieza requiere "
        "revision humana, indicar que observaciones concretas debe corregir, y ser amable y orientador "
        "(tono de asesor, no de juez). No uses tecnicismos. Devuelve solo el texto del mensaje. "
        "Importante: nunca uses guiones largos. Usa siempre guiones cortos -. "
        "Nunca uses comillas angulares. Usa siempre comillas normales."
    )
    datos = {
        "tipo_riesgo": sol.get("tipoRiesgo"),
        "tipo_pieza": sol.get("tipo"),
        "observaciones_redaccion": sol.get("feedbackPaso2", {}).get("fallos", []),
        "observaciones_legal": sol.get("feedbackPaso4", {}).get("observaciones", []),
    }
    import json
    prompt = "Datos de la solicitud:\n" + json.dumps(datos, ensure_ascii=False, indent=2)
    try:
        resp = client().models.generate_content(model=MODEL, contents=prompt, config=_config(sys, json_mode=False, temperature=0.4))
        return (resp.text or "").strip()
    except Exception as e:
        return (
            f"Esta comunicacion requiere ajustes antes de poder aprobarse. "
            f"Por favor revisa las observaciones indicadas en el flujo de validacion "
            f"y corrige los puntos senalados. Si tienes dudas, contacta al equipo CX."
        )


def info_modelo() -> dict:
    return {"project": PROJECT, "location": LOCATION, "model": MODEL}
