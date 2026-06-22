# Prompt para Claude Code — Sistema de Validación de Comunicaciones (Mibanco)

> Copia todo lo que está debajo de la línea en Claude Code como instrucción inicial.

---

## Contexto y objetivo

Construye una aplicación web **full-stack en un único servicio desplegable en Google Cloud Run** (backend + frontend en el mismo contenedor) que automatice el proceso de **validación de comunicaciones** de Mibanco. Hoy el proceso es manual: las áreas (Productos, Digital, Negocios, etc.) envían piezas (SMS, email, WhatsApp, push, cartas, speech) y el equipo CX (Experiencia) las valida una por una, hasta 30 min por caso. Queremos automatizar esa validación con agentes de IA y dejar a CX solo la aprobación final.

El sistema tiene un **flujo de 5 pasos** por solicitud y **dos vistas**:

- **Vista CX (Experiencia):** ve TODAS las solicitudes de todas las áreas y monitorea su flujo. Interviene principalmente en el **Paso 5** (aprobación final).
- **Vista Solicitante:** cada área ve SOLO sus propias solicitudes. Atiende observaciones en los Pasos 2, 3 y 4, y publica cuando CX aprueba.

**Esto es un MVP que se demostrará en vivo durante ~3 minutos.** Prioriza que toda la lógica funcione y que sea rápido de levantar. No te preocupes por el diseño visual ni por escalar; usa los colores de Mibanco (verde `#009639`, amarillo `#FFC40C`) de forma básica.

---

## Stack técnico (obligatorio)

- **Backend:** Python + **FastAPI**. Sirve la API REST y también los archivos estáticos del frontend ya compilado (un solo servicio, un solo puerto, una sola imagen Docker).
- **Frontend:** **React + Vite** (compilado a estáticos que sirve FastAPI desde `/`). TypeScript opcional.
- **IA:** **Gemini en Vertex AI** (Google Cloud). Usa la librería oficial (`google-genai` con `vertexai=True`, o el SDK `vertexai`). Autenticación por **Application Default Credentials (ADC)** / la service account de Cloud Run — NO uses API keys hardcodeadas. Configura por variables de entorno: `GOOGLE_CLOUD_PROJECT`, `GOOGLE_CLOUD_LOCATION` (p.ej. `us-central1`), y `GEMINI_MODEL`. Usa un **modelo Gemini multimodal** (el mismo sirve para texto e imágenes; p.ej. `gemini-2.5-flash` o `gemini-2.5-pro` — confirma cuál está disponible en tu región). Todas las llamadas a IA van en el backend.
- **Persistencia de datos: NINGUNA base de datos. Datos estructurados en memoria (RAM).** Guarda las solicitudes en un dict en Python. Es un MVP de demo: si el servicio reinicia, los datos se pierden, y está bien. **No uses Firestore ni ninguna base de datos.**
- **Almacenamiento de imágenes: Google Cloud Storage.** Una solicitud puede llegar con **varias imágenes**, y cada una se sube y se almacena **por separado** en un bucket (`GCS_BUCKET`). En el registro en memoria guarda solo la **referencia** de cada imagen (ruta/URL en GCS), no el binario. Para desarrollo local deja un fallback a carpeta `./uploads` por variable de entorno (`STORAGE_BACKEND=local|gcs`).
  - Como el estado estructurado vive en RAM, despliega Cloud Run con **`--min-instances=1 --max-instances=1`** para que todas las peticiones de la demo peguen a la misma instancia.
- **Deploy:** un único `Dockerfile` multi-stage (build del frontend → copia al contenedor Python → arranca uvicorn). Incluye en el README el comando `gcloud run deploy`.

Estructura sugerida:
```
/backend        (FastAPI, agentes IA Gemini, store en memoria)
/frontend       (React+Vite)
/Dockerfile     (multi-stage)
/README.md      (cómo correr local y desplegar)
```

---

## Modelo de datos (estructura en memoria: `dict[str, Solicitud]`; imágenes en GCS)

```
Solicitud {
  id, titulo, remitente, fecha, area, tipo,   // tipo: SMS|Email|WhatsApp|Push|Carta|Speech
  contenidoOriginal, contenidoActual,
  asesor: { nombre, telefono },               // datos del Asesor de Negocios (email/sms)
  imagenes: [ { id, nombre, gcsPath, url, validada, resultado, detalle } ],  // ref a GCS, no binario
  pasoActual,                                  // 1..5
  estados: { paso1, paso2, paso3, paso4, paso5 },  // valores: locked|proc|obs|wait|ok
  feedbackPaso2: { fallos:[], principios:[], contenidoCorregido },
  feedbackPaso3: [ {imagenId, ok, observaciones, sugerencias} ],
  feedbackPaso4: { ok, observaciones:[], sugerencias:[] },
  brief, aprobadoCX, publicado,
  historial: [ {ts, actor, accion} ]
}
```
Colores frontend: `ok`=verde, `obs`=amarillo, `wait`=morado/espera, `proc`=azul, `locked`=gris.

---

## Lógica del flujo (5 pasos)

### Paso 1 — Recepción de solicitud
Recibe (simulando la llegada de un correo): **remitente, fecha, área, tipo de pieza, contenido, imágenes**. **Cada imagen adjunta se sube por separado a GCS** y en la solicitud se guarda su referencia. Al crearse, `paso1="ok"` automáticamente y se dispara el Paso 2. El modal solo muestra estos datos (solo lectura).

### Paso 2 — Validación de redacción (Agente IA)
Un agente Gemini revisa **tono, claridad, simplicidad y formato** según el canal (prompt del Agente 2, abajo).
- Si hay problemas → `paso2="obs"` (amarillo). El modal muestra: fallos, principios afectados y una **comparación lado a lado** (original vs corregido por IA).
- Desde **vista Solicitante**: puede **aceptar** la corrección de la IA (→ `ok`, avanza), o **escribir su propia versión** y **re-validar con IA**; solo cuando la IA aprueba → `ok`.
- Si el mensaje ya estaba bien → `ok` directo.

### Paso 3 — Validación de marca / imágenes (Agente IA multimodal)
Solo aplica si hay imágenes; si no, marca `ok` y avanza. El agente Gemini procesa **cada imagen por separado** (descargándola de GCS) e identifica si cumple el **branding** comparando contra **imágenes de referencia + descripción del branding** (prompt del Agente 3).
- Si alguna no cumple → `paso3="obs"`. El modal muestra por imagen: resultado + sugerencias. **No corrige**: el solicitante **sube una nueva imagen** (se almacena en GCS como nueva versión) y el agente la re-valida.
- Cuando todas cumplen → `ok`, avanza.

### Paso 4 — Validación legal y cumplimiento (Agente IA + participación del solicitante)
Un agente revisa normativa, riesgos y cumplimiento: **sin datos sensibles, no parece fraude, no promete de más, cumple normativa**.
- Si hay observaciones → `paso4="obs"` (amarillo). El modal muestra las observaciones y sugerencias del agente.
- **Aquí también participa el solicitante** (igual que en Pasos 2 y 3): desde **vista Solicitante** puede **ajustar el contenido** según las observaciones legales y **re-validar**; solo cuando la validación legal queda conforme → `paso4="ok"`, avanza al Paso 5.
- Si no hay observaciones → `ok` directo.

### Paso 5 — Brief + Aprobación CX
Se **genera automáticamente un brief** (resumen de todos los pasos) con un agente Gemini.
- **Vista Solicitante:** `paso5="wait"` (esperando aprobación CX), solo lectura del brief.
- **Vista CX:** abre el modal, revisa el brief y da el **visto bueno** → `aprobadoCX=true`, `paso5="ok"`.
- Tras la aprobación, en **vista Solicitante** se habilita **Publicar comunicación** (`publicado=true`).

> Regla transversal: solicitudes que toquen **reclamos, crisis coyunturales u ofertas comerciales** se marcan para **revisión humana obligatoria** (no se auto-aprueban en pasos IA). Detéctalo por keywords o por clasificación del Agente 1.

---

## Endpoints REST (mínimos)

```
POST   /api/solicitudes                          # crea (paso 1) + dispara paso 2
GET    /api/solicitudes?vista=cx|sol&area=...    # lista (filtra por vista/área)
GET    /api/solicitudes/{id}                     # detalle + estados
POST   /api/solicitudes/{id}/paso2/aceptar       # acepta corrección IA
POST   /api/solicitudes/{id}/paso2/revalidar     # body {contenido} -> re-valida con IA
POST   /api/solicitudes/{id}/paso3/imagen        # multipart: nueva imagen -> revalida
POST   /api/solicitudes/{id}/paso4/revalidar     # body {contenido} -> re-valida legal
POST   /api/solicitudes/{id}/paso4/aceptar       # acepta tal cual si conforme
GET    /api/solicitudes/{id}/brief               # genera/obtiene brief (paso 5)
POST   /api/solicitudes/{id}/aprobar             # CX aprueba (paso 5)
POST   /api/solicitudes/{id}/publicar            # solicitante publica
```

---

## Prompts de los agentes IA (Gemini)

**Agente 2 — Redacción.** "Eres validador de comunicaciones de Mibanco, banco peruano para microempresarios (público ~42 años, estudios secundarios/técnicos, baja formalización, desconfianza al sistema financiero). Evalúa según: (1) Lenguaje simple y cercano. (2) Mensaje claro, sin confusión. (3) Sin riesgos: no parece fraude, no promete de más. (4) Seguro y transparente: sin datos sensibles ni dudas legales. (5) Fácil de actuar: CTA claro y orden lógico. Canal: SMS = máx 160 caracteres, remitente 'Mibanco Oficial'; WhatsApp = corto; Email = saludo y personalización + datos del Asesor de Negocios; Push = título y cuerpo. Responde SOLO JSON: {cumple, fallos:[], principios_afectados:[], contenido_corregido}."

**Agente 3 — Marca/Imágenes.** "Eres validador de identidad de marca de Mibanco. Te doy imágenes de referencia del branding correcto y la imagen a evaluar. Verifica: logo (sol amarillo institucional), verde Mibanco (#009639) y amarillo (#FFC40C), proporciones, legibilidad y alineación de marca. No corrijas, solo evalúa. Responde SOLO JSON: {cumple, observaciones:[], sugerencias:[]}."

**Agente 4 — Legal/Cumplimiento.** "Eres validador legal y de cumplimiento de Mibanco. Revisa el mensaje y detecta: datos sensibles expuestos, lenguaje que parezca fraude, promesas no permitidas o exageradas, y posibles incumplimientos normativos. Responde SOLO JSON: {cumple, observaciones:[], sugerencias:[]}."

**Agente Brief (Paso 5).** "Genera un brief ejecutivo en español (máx 200 palabras) que resuma: pieza, canal, área, versión final del mensaje y el resultado de cada validación (redacción, marca, legal), claro y accionable para que CX apruebe."

Pon los principios/consideraciones como constantes configurables (`criterios.py` o `.json`) para ajustarlos sin tocar el código del agente.

---

## Frontend (React)

- **Selector de vista** arriba: `Vista CX` / `Vista Solicitante`.
- **Lista de solicitudes** filtrada por vista, con badge de estado.
- **Detalle** con el **flujo horizontal de 5 cajitas clickeables**; cada cajita cambia de color según su estado y abre un **modal** con la lógica de arriba (comparación antes/después en Paso 2; validación por imagen + re-subida en Paso 3; observaciones legales + ajuste/re-validación del solicitante en Paso 4; brief + aprobar/publicar en Paso 5).
- Usa el mockup HTML adjunto (`mockup_validacion.html`) como **referencia funcional** del comportamiento de cada modal y estado.

---

## Entregables

1. Código completo backend + frontend en un repo.
2. `Dockerfile` multi-stage que produce **una sola imagen** para Cloud Run.
3. `README.md` con: cómo correr local, variables de entorno (`GOOGLE_CLOUD_PROJECT`, `GOOGLE_CLOUD_LOCATION`, `GEMINI_MODEL`, `GCS_BUCKET`, `STORAGE_BACKEND`), y el comando `gcloud run deploy --min-instances=1 --max-instances=1`.
4. **Seed en memoria** con al menos 5 solicitudes en distintos estados del flujo para demostrarlo de inmediato (recuerda: los datos viven solo en RAM).

Empieza proponiendo la estructura de carpetas y el plan; luego backend, luego frontend, y el deploy al final.
