"""
Agentes IA basados en Gemini (Vertex AI).

Autenticación por Application Default Credentials (ADC) / service account de Cloud Run.
NO se usan API keys. Configuración por variables de entorno:
  GOOGLE_CLOUD_PROJECT, GOOGLE_CLOUD_LOCATION, GEMINI_MODEL.

Agentes:
  1. clasificar          -> detecta reclamo/crisis/oferta -> revisión humana obligatoria
  2. validar_redaccion   -> tono, claridad, simplicidad, formato por canal
  3. validar_imagen      -> branding (multimodal)
  4. validar_legal       -> normativa, riesgos, datos sensibles
  5. generar_brief       -> resumen ejecutivo para CX
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


# ---------------------------------------------------------------------------
# Agente 1 — Clasificación (revisión humana obligatoria)
# ---------------------------------------------------------------------------
def clasificar(tipo: str, contenido: str) -> dict:
    sys = (
        f"{_ctx_marca()} "
        "Eres un clasificador de comunicaciones. Clasifica la pieza en una de estas categorías: "
        "'reclamo' (gestión de reclamos/quejas de clientes), 'crisis' (situación coyuntural sensible, "
        "fraude, emergencia), 'oferta_comercial' (promoción, descuento, oferta) o 'normal'. "
        "Las categorías reclamo, crisis y oferta_comercial SIEMPRE requieren revisión humana obligatoria "
        "y no pueden auto-aprobarse. "
        "Responde SOLO JSON: {\"tipo_riesgo\": \"reclamo|crisis|oferta_comercial|normal\", "
        "\"requiere_revision_humana\": true|false, \"motivo\": \"...\"}"
    )
    prompt = f"Tipo de pieza: {tipo}\nContenido:\n{contenido}"
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
        f"Eres validador de comunicaciones de Mibanco. {_ctx_marca()} "
        f"Evalúa el mensaje según estos principios: {principios}. "
        f"Regla específica del canal '{tipo}': {regla} "
        "Si el canal es Email o Carta debe incluir los datos del Asesor de Negocios. "
        "Si encuentras problemas, propón una versión corregida que respete TODOS los principios "
        "y la regla del canal, manténla natural y cercana, usa {Nombre} y {Asesor} como placeholders cuando aplique. "
        "Responde SOLO JSON con esta forma exacta: "
        "{\"cumple\": true|false, \"fallos\": [\"...\"], \"principios_afectados\": [\"...\"], "
        "\"contenido_corregido\": \"...\"}. "
        "Si cumple es true, fallos y principios_afectados van vacíos y contenido_corregido es el mensaje tal cual."
    )
    asesor_txt = f"{asesor.get('nombre','')} ({asesor.get('telefono','')})" if asesor else "no especificado"
    prompt = f"Canal: {tipo}\nDatos del Asesor de Negocios: {asesor_txt}\nMensaje a evaluar:\n{contenido}"
    default = {"cumple": True, "fallos": [], "principios_afectados": [], "contenido_corregido": contenido}
    try:
        resp = client().models.generate_content(model=MODEL, contents=prompt, config=_config(sys))
        out = _parse_json(resp.text, default)
        out.setdefault("cumple", True)
        out.setdefault("fallos", [])
        out.setdefault("principios_afectados", [])
        if not out.get("contenido_corregido"):
            out["contenido_corregido"] = contenido
        return out
    except Exception as e:
        return {**default, "fallos": [f"No se pudo validar con IA: {e}"], "error": str(e)}


# ---------------------------------------------------------------------------
# Agente 3 — Validación de marca / imágenes (multimodal)
# ---------------------------------------------------------------------------
def validar_imagen(img_bytes: bytes, mime_type: str, nombre: str) -> dict:
    from google.genai import types
    sys = (
        "Eres validador de identidad de marca de Mibanco. "
        f"Branding de referencia: {criterios.BRANDING['descripcion']} "
        "Verifica en la imagen: presencia y color correcto del logo (sol amarillo institucional), "
        "uso del verde Mibanco (#009639) y amarillo (#FFC40C), proporciones, legibilidad y alineación de marca. "
        "No corrijas la imagen, solo evalúa. "
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
        f"Eres validador legal y de cumplimiento de Mibanco. {_ctx_marca()} "
        "Revisa el mensaje y detecta: datos sensibles expuestos, lenguaje que parezca fraude o phishing, "
        "promesas no permitidas o exageradas, ausencia del canal oficial de contacto y posibles "
        "incumplimientos normativos (protección al consumidor financiero, transparencia). "
        "Si hay observaciones, incluye una versión sugerida del mensaje que las resuelva en 'contenido_corregido'. "
        "Responde SOLO JSON: {\"cumple\": true|false, \"observaciones\": [\"...\"], "
        "\"sugerencias\": [\"...\"], \"contenido_corregido\": \"...\"}"
    )
    prompt = f"Canal: {tipo}\nMensaje a revisar:\n{contenido}"
    default = {"cumple": True, "observaciones": [], "sugerencias": [], "contenido_corregido": contenido}
    try:
        resp = client().models.generate_content(model=MODEL, contents=prompt, config=_config(sys))
        out = _parse_json(resp.text, default)
        out.setdefault("cumple", True)
        out.setdefault("observaciones", [])
        out.setdefault("sugerencias", [])
        if not out.get("contenido_corregido"):
            out["contenido_corregido"] = contenido
        return out
    except Exception as e:
        return {**default, "error": str(e)}


# ---------------------------------------------------------------------------
# Agente Brief — Paso 5
# ---------------------------------------------------------------------------
def generar_brief(sol: dict) -> str:
    sys = (
        "Eres asistente de CX de Mibanco. Genera un brief ejecutivo en español (máximo 200 palabras) "
        "que resuma de forma clara y accionable para que CX apruebe: pieza, canal, área, versión final "
        "del mensaje y el resultado de cada validación (redacción, marca/imágenes, legal). "
        "Si la solicitud requiere revisión humana obligatoria, indícalo de forma destacada. "
        "Devuelve solo el texto del brief, sin markdown ni encabezados extra."
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


def info_modelo() -> dict:
    return {"project": PROJECT, "location": LOCATION, "model": MODEL}
