# Estado del proyecto — Mibanco · Validación de Comunicaciones (MVP)

> Documento de **handoff** para continuar en otra sesión. Última actualización: 2026-06-22.
> Todo el proyecto se construyó y desplegó usando **exclusivamente** la cuenta
> `carlos.escobar.arroyo@gmail.com` y el proyecto GCP `glamour-peru-dw`. **No usar otra cuenta.**

---

## 1. Resumen ejecutivo

App full-stack (un solo servicio en Cloud Run) que automatiza la validación de comunicaciones
de Mibanco con **5 agentes de IA (Gemini en Vertex AI)**. Flujo de 5 pasos + 2 vistas (CX y
Solicitante). **Está terminada, desplegada y verificada end-to-end en producción** (incluida la UI
por navegador headless).

- **App en vivo:** https://mibanco-validacion-660529019743.us-central1.run.app
  (URL alterna equivalente: https://mibanco-validacion-od2g645wkq-uc.a.run.app)
- **Estado actual:** revisión `mibanco-validacion-00010-hv2`, seed de 6 solicitudes (incluye un correo
  `.msg` ya importado, SOL-006). Incluye el **rediseño visual completo** (§12) y la **visualización
  interactiva del `.msg` a lo largo de todo el flujo** con antes/después realista de dos columnas (§13).
- **Repo local:** `/Users/carlosescobar/Projects/hackaton_mibanco/project` (NO es git aún).

---

## 2. Configuración GCP (CRÍTICO — memorizar)

| Dato | Valor |
|---|---|
| Cuenta (única) | `carlos.escobar.arroyo@gmail.com` (es **owner** del proyecto) |
| Proyecto | `glamour-peru-dw` (número `660529019743`) |
| Región | `us-central1` |
| Modelo Gemini | `gemini-2.5-flash` (multimodal: texto + imágenes) |
| Servicio Cloud Run | `mibanco-validacion` |
| Service account runtime | `aurora-agent-app@glamour-peru-dw.iam.gserviceaccount.com` |
| Bucket de imágenes (GCS) | `glamour-peru-dw-mibanco-uploads` (us-central1, uniform access) |
| Escalado | `--min-instances=1 --max-instances=1` (estado en RAM → 1 sola instancia) |
| Acceso | público (`--allow-unauthenticated`) |

### Identidad / permisos (cómo quedó resuelto)
- El runtime corre como **`aurora-agent-app@`** porque ya tenía `roles/aiplatform.user` (Vertex AI).
- A esa SA se le concedió `roles/storage.objectAdmin` **solo sobre el bucket** (binding a nivel
  bucket, least-privilege). **No se hicieron cambios de IAM a nivel proyecto.**
- ⚠️ Importante: el clasificador de seguridad de Claude Code **bloquea** los grants de IAM a nivel
  proyecto (p.ej. `add-iam-policy-binding ... --role=roles/aiplatform.user`). Por eso se usó esta
  ruta. Si en el futuro se necesita otra SA con Vertex, preferir la SA `aurora-agent-app@` o
  bindings a nivel recurso.
- APIs ya habilitadas: aiplatform, run, cloudbuild, artifactregistry, storage.

---

## 3. Arquitectura

```
project/
├── backend/                 # FastAPI: API REST + sirve el frontend compilado
│   ├── main.py              # endpoints + monta estáticos en "/" + seed() al importar
│   ├── service.py           # orquestación del flujo de 5 pasos (máquina de estados)
│   ├── agents.py            # 5 agentes Gemini (Vertex AI, google-genai vertexai=True)
│   ├── store.py             # store en memoria (dict) + 5 solicitudes seed
│   ├── storage.py           # abstracción GCS / local (./uploads)
│   ├── msg_import.py        # ingesta de correos Outlook .msg (parseo + descarga banners)
│   ├── criterios.py         # principios/branding/keywords CONFIGURABLES (sin tocar agentes)
│   └── requirements.txt
├── frontend/                # React + Vite (JSX, no TS — build más robusto)
│   ├── src/App.jsx          # toda la UI: vistas, lista, flujo, modales, nueva solicitud
│   ├── src/api.js           # wrappers fetch a /api/*
│   ├── src/styles.css       # estilos (portados del mockup + extras)
│   ├── index.html, main.jsx, vite.config.js
│   └── package.json
├── Dockerfile               # multi-stage: build frontend (node) -> runtime python
├── .dockerignore / .gcloudignore
├── README.md                # cómo correr local + comando de deploy
└── ESTADO_PROYECTO.md       # este documento

data/  (carpeta hermana, fuera de project/)
├── Test  FIO  Seguimos mejorando tu experiencia digital .msg     # correo real de prueba
└── Test SHIRLEY  Ingresa a la App Mibanco solo con tu tarjeta de débito.msg
```

**Stack:** Python 3.13 (local) / 3.12 (Docker), FastAPI, uvicorn, google-genai,
google-cloud-storage, extract-msg. Frontend: React 18 + Vite 5. **Sin base de datos** (todo en RAM).

---

## 4. Lógica del flujo (5 pasos)

Estados por paso: `locked | proc | obs | wait | ok` (colores: ok=verde, obs=amarillo,
wait=morado, proc=azul, locked=gris).

1. **Recepción** — al crear, `paso1=ok` y dispara paso 2 automáticamente. Solo lectura.
2. **Redacción (IA)** — Agente 2 evalúa tono/claridad/formato por canal. `ok`→avanza; `obs`→el
   solicitante acepta la corrección o reenvía su versión para re-validar.
3. **Marca/imágenes (IA multimodal)** — solo si hay imágenes. Valida cada imagen contra el branding.
   `obs`→el solicitante sube una nueva imagen y se re-valida.
4. **Legal/cumplimiento (IA)** — Agente 4 detecta datos sensibles, fraude, promesas, normativa.
   `obs`→el solicitante ajusta y re-valida, o acepta el ajuste sugerido.
5. **Brief + Aprobación CX** — Agente Brief genera resumen; CX aprueba (`aprobadoCX`); luego el
   solicitante publica (`publicado`).

**Regla transversal:** Agente 1 + keywords clasifican reclamos/crisis/ofertas comerciales →
`requiereRevisionHumana=true` (badge rojo "Revisión humana" + nota en el brief).

El encadenamiento es automático: un mensaje limpio sin imágenes pasa solo hasta `paso5=wait`.

---

## 5. Endpoints REST

```
POST   /api/solicitudes                      crea (multipart) + dispara validación
POST   /api/solicitudes/importar             multipart: correo .msg -> crea + valida
GET    /api/solicitudes?vista=cx|sol&area=   lista (sol = solo Área Productos)
GET    /api/solicitudes/{id}                 detalle + estados
POST   /api/solicitudes/{id}/paso2/aceptar
POST   /api/solicitudes/{id}/paso2/revalidar {contenido}
POST   /api/solicitudes/{id}/paso3/imagen    multipart: nueva imagen
POST   /api/solicitudes/{id}/paso4/revalidar {contenido}
POST   /api/solicitudes/{id}/paso4/aceptar
GET    /api/solicitudes/{id}/brief
POST   /api/solicitudes/{id}/aprobar         CX
POST   /api/solicitudes/{id}/publicar        solicitante
GET    /api/imagenes/{storage_id}            sirve el binario (proxy GCS/local)
GET    /api/health                           salud + modelo + storage
```

---

## 6. Funcionalidades especiales implementadas (más allá del prompt original)

### a) Ingesta de correos `.msg` de Outlook
- `backend/msg_import.py` parsea el `.msg` (lib `extract-msg`): asunto→título, remitente, fecha,
  cuerpo (limpio). Las imágenes de estos correos **no son adjuntos**: son **URLs externas** (CDN
  embluemail) embebidas en el HTML. Se **descargan** (prioriza banners sobre íconos, cap 3, descarta
  píxeles de tracking <1.5KB), se suben a GCS y se validan en el Paso 3.
- Descarga robusta a SSL entre entornos (certifi → contexto por defecto → sin verificar como último
  recurso). Esto es necesario porque en macOS Python falla la verificación de certificados.

### b) Modal unificado "Nueva solicitud" (último cambio del usuario)
- **Solo aparece en la Vista Solicitante** (el botón no está en CX).
- Un único modal con **selector de "Tipo de mensaje que quieres enviar"** + control segmentado de
  dos modos: **✍️ Escribir mensaje** (formulario) o **📧 Adjuntar correo (.msg)**.
- Lo creado se asigna al **Área Productos** (la del solicitante) → se ve en su vista **y** en CX
  (CX ve todas).

---

## 7. Datos seed (RAM, se recargan en cada arranque)

5 solicitudes en estados distintos para demo inmediata (feedback pre-calculado, NO llaman a IA al
arrancar). Las solicitudes **nuevas/importadas sí ejecutan Gemini en vivo**.

| ID | Tipo | Estado |
|---|---|---|
| SOL-001 | SMS | Paso 2 observado (Productos) |
| SOL-002 | Email | Paso 3 observado, imagen mala (Digital) |
| SOL-003 | WhatsApp | Paso 4 legal observado (Negocios) |
| SOL-004 | Push | Paso 5 esperando CX (Productos) |
| SOL-005 | SMS | Aprobado (Digital) |

La Vista Solicitante simula el **Área Productos** → muestra SOL-001 y SOL-004.

---

## 8. Deploy y operación

### Redesplegar (tras cualquier cambio de código)
```bash
cd /Users/carlosescobar/Projects/hackaton_mibanco/project
gcloud run deploy mibanco-validacion \
  --source . \
  --project glamour-peru-dw \
  --region us-central1 \
  --allow-unauthenticated \
  --min-instances=1 --max-instances=1 \
  --memory 1Gi --cpu 1 --timeout 300 \
  --service-account aurora-agent-app@glamour-peru-dw.iam.gserviceaccount.com \
  --set-env-vars GOOGLE_CLOUD_PROJECT=glamour-peru-dw,GOOGLE_CLOUD_LOCATION=us-central1,GEMINI_MODEL=gemini-2.5-flash,STORAGE_BACKEND=gcs,GCS_BUCKET=glamour-peru-dw-mibanco-uploads
```
> Usa **Cloud Build** (no requiere Docker local — Docker NO está instalado en esta máquina).
> El build tarda ~3-5 min.

### Reiniciar al seed limpio (borra solicitudes creadas en la demo, vuelve a las 5)
```bash
gcloud run services update mibanco-validacion --region us-central1 --update-labels demo=cleanN
```
(Cambiar `cleanN` por un valor nuevo cada vez → fuerza nueva revisión → RAM fresca → re-seed.)

### Correr local
```bash
# backend
cd backend && python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
export GOOGLE_CLOUD_PROJECT=glamour-peru-dw GOOGLE_CLOUD_LOCATION=us-central1 \
       GEMINI_MODEL=gemini-2.5-flash STORAGE_BACKEND=local
gcloud auth application-default login   # ADC (ya existe en esta máquina)
uvicorn main:app --reload --port 8080
# frontend (otra terminal)
cd frontend && npm install && npm run dev   # http://localhost:5173 (proxy /api -> :8080)
```

---

## 9. Gotchas / aprendizajes (para no repetir)

- **Docker no está instalado** localmente → deploy siempre vía `gcloud run deploy --source` (Cloud Build).
- **IAM a nivel proyecto bloqueado** por el clasificador de seguridad → usar `aurora-agent-app@` +
  bindings a nivel bucket.
- **macOS Python SSL**: `urllib` falla verificación de certificados (`CERTIFICATE_VERIFY_FAILED`).
  Ya está mitigado en `msg_import.py` con fallback de contextos SSL.
- **seed()** se llama al **importar** `main.py` (no en `@app.on_event("startup")`) para que sea
  determinista (el `startup` no dispara con `TestClient` fuera de contexto).
- **zsh `echo`** interpreta `\n` → al testear por curl, guardar la respuesta a archivo y parsear con
  python (`-o resp.json`), no `echo "$VAR" | python`.
- Las imágenes de los seeds tienen `url=None` (no hay binario) → la UI muestra placeholder 🖼.
- Un `.msg` "limpio" puede encadenar varios pasos en una sola llamada (paso2→3→4→5) y tardar
  ~30-60s con el spinner. Es esperado (todo síncrono).

---

## 10. Posibles siguientes pasos (no hechos)

- Inicializar git + primer commit (el repo no está versionado).
- Editar criterios en `backend/criterios.py` con los lineamientos reales de Mibanco.
- Conseguir imágenes de referencia de branding reales para el Agente 3 (hoy usa descripción textual).
- Persistencia real si se quisiera pasar de demo a piloto (hoy es RAM a propósito).
- Manejo de adjuntos `.msg` con imágenes embebidas (cid) ya está soportado en código, pero los
  correos de prueba usan URLs externas.
- Endpoint para borrar solicitudes (hoy solo se limpia reiniciando el servicio).

---

## 12. Rediseño visual (2026-06-21) — marca real Mibanco

Se rediseñó toda la UI (sin tocar el contrato de datos, los endpoints ni la lógica de roles/flujo)
para que la demo de 3 min se vea profesional, moderna y 100% Mibanco. Cambios solo en
`frontend/src/App.jsx`, `frontend/src/styles.css`, `frontend/index.html` (+ un matiz de copy en
`backend/store.py`). Backup del frontend previo en `frontend/.backup_pre_rediseno/`.

**Marca real (investigada y verificada):** verde institucional `#009639` + sol amarillo `#F8D000`
(NO naranja). El isotipo es el "espiral de progreso" (rayos crecientes), recreado como **SVG inline**
(componente `Sol` en App.jsx) en vez del emoji ☀. Tipografía **Nunito + Mulish** (Google Fonts por
CDN; imitan la Brevia/Museo Sans propietarias). Tono cálido/redondeado.

**Novedades de UI** (todas derivadas de datos existentes, sin nuevas llamadas API ni dependencias):
- App shell con topbar en degradado verde, logo SVG animado y chip de entorno con punto "IA en vivo".
- **Mini-dashboard** de 4 métricas (total / con observaciones / esperando CX / aprobadas-publicadas).
- Chip de **rol** por vista (CX azul 👁 / Solicitante verde ✍).
- **Stepper-timeline** de los 5 agentes con conector que se pinta verde al avanzar, pulso en el paso
  "proc" y **barra de progreso global** (done/5).
- Overlay de carga IA "premium" (sol girando + 5 puntos en secuencia), modales con animación de
  entrada + cierre con Escape, accesibilidad (focus-visible, aria-live, roles, `prefers-reduced-motion`).

**Sistema de tokens** en `:root` (variables `--brand*`, `--brand-sun`, `--sun-*`, semánticos, sombras,
radios). Se conservaron los alias `--green/--green-d/--gray-d` usados inline por el JSX.

**Proceso:** investigación de marca (subagente web) + escaneo del proyecto + guía UX/UI con 14
criterios de aceptación; implementación; **loop de verificación UX/UI** (4 revisores por lente) que
encontró y corrigió: bucles del overlay sin gate `prefers-reduced-motion` (AC-13), conector del
stepper sin colorear, chip de rol, `system-ui` residual y tokens muertos. Verificado por screenshots
headless (local y en vivo).

---

## 13. Visualización del `.msg` y antes/después realista (2026-06-21/22)

Mejora pedida por el usuario (jurado de Experiencia Mibanco): ver el correo `.msg` de forma **atractiva
e interactiva a lo largo de todo el flujo**, con preview y un **antes/después realista** en cada sugerencia
del agente, resaltando los cambios en **verde Mibanco**. Cambios solo aditivos (sin romper contratos).

**Backend** (`msg_import.py`, `main.py`, `store.py`):
- `msg_import.py` captura y **sanitiza el HTML real** del correo (quita scripts, comentarios MSO, `href`/
  `target`/`on*` → inerte; colapsa los `<p></p>` vacíos de Outlook; conserva imágenes del CDN público de
  emblue). Construye un **modelo `preview`** (asunto, remitente, email, fecha, saludo, cuerpo, `bannerUrl`/
  `bannerUrlCdn`, `imagenesCdn`). Recorta el **pie legal** del cuerpo (markers en `_PIE_MARCADORES`).
  Prioriza el **banner hero** sobre la tira header/footer (`_HERO`/`_SECUNDARIO`).
- `main.py` adjunta `correoHtml` + `preview` a la solicitud importada (banner = imagen proxeada si se
  descargó, si no el CDN).
- `store.py` incluye **SOL-006**: el correo SHIRLEY ya importado (paso 2 observado) para demostrar el
  preview + antes/después sin importar en vivo. Artefactos en **`backend/seed_data/`** (`correo_shirley.html`
  + `preview_shirley.json`), generados desde el `.msg` real. **Importante:** `backend/seed_data/` SÍ entra al
  build de Docker (`COPY backend/`), no lo ignores.
  - *Regenerar los artefactos* (desde `backend/`, con la cuenta correcta): correr `msg_import.parse_msg()`
    sobre el `.msg` de SHIRLEY y volcar `correoHtml`→`seed_data/correo_shirley.html` y `preview`→
    `seed_data/preview_shirley.json` (con `preview["bannerUrl"]=preview["bannerUrlCdn"]`). Para evitar
    descargas de red en local, se parchea `msg_import._descargar` para que lance excepción (el preview usa
    los URLs del CDN público, no necesita descargar). El `.msg` está en `../data/` (fuera de `project/`,
    **no** se despliega).

**Frontend** (`src/App.jsx`, `src/styles.css`):
- `DevicePreview` **channel-aware**: mockup de correo branded, **SMS** (teléfono), **WhatsApp**, **Push**
  (lock-screen), **Carta** y **Speech**. Las imágenes cargan del CDN con `onError` → proxy.
- `EmailRealPreview`: HTML real del correo en **iframe sandbox** (`allow-same-origin`, sin scripts).
- `PreviewPanel` con toggle **Vista Mibanco ↔ Correo original**, presente en los 5 pasos y el detalle.
- `BeforeAfter` — bloque "Cambios sugeridos por el agente": **comparativo de DOS columnas** (`.ba-compare`):
  *Versión original* (izquierda, con lo reemplazado en **tachado tenue** — no rojo agresivo) y *Versión
  corregida por IA* (derecha, con lo nuevo/mejorado resaltado en **verde Mibanco**, `mark.df-add`; verde
  sólido + texto blanco sobre burbujas SMS/WhatsApp). Diff LCS por palabras (`wordDiff` + `DiffInline
  only="antes"|"despues"`). Debajo, mockups antes→después del canal (colapsables, `.ba-grid`).
  ⚠️ **Por qué dos columnas:** el diff interlineado original (todo en una línea) se volvía ilegible cuando el
  agente reescribía casi todo; el comparativo lado a lado se lee como prosa natural sin importar cuánto cambie.
- **UX en segundo plano** (`runBg` en App.jsx): al aplicar un cambio el **modal se cierra** y el cambio corre
  sin bloqueo; el paso se anima como **"procesando"** (`.step.working` + spinner, `working-banner`, barra con
  shimmer). Estado `pending {id, paso, label}` en `App`, pasado a `Detalle`. Reemplaza el viejo overlay
  bloqueante "Aplicando…". (Crear/importar sí mantienen el overlay premium, es la carga inicial deliberada.)
- **Orden del panel de detalle** (`Detalle` en App.jsx): 1) **Flujo de 5 agentes** (stepper) → 2) **Progreso
  de validación** (barra) → 3) **Vista previa de la pieza** (`PreviewPanel`) → Historial. El `working-banner`
  va arriba del flujo. (El usuario pidió este orden explícitamente.)

**Auditoría:** ejército de **12 auditores UX/UI adversariales** (6 lentes × verificación escéptica) sobre
**capturas reales** (Playwright headless) + código. Se aplicaron los hallazgos reales de alto impacto
(legibilidad del verde en burbujas, banner hero, diff con tachado, bordes `brand-100`→`brand-300`, bloqueo
de scroll de fondo en modales, responsive del modal ancho). Varios "HIGH" de "banner-no-renderiza" eran
falsos positivos (las capturas confirman que el banner CDN sí carga). **Playwright se desinstaló del
`package.json` antes de desplegar** (su postinstall bajaría Chromium y rompería el build de Docker) — NO lo
reagregues como dependencia. Patrón de verificación: `npm i -D playwright` temporal → screenshots → `npm
uninstall playwright` → deploy.

**Revisiones desplegadas (sesión 22/06/2026):** `00008-rrp` (preview + antes/después inicial) → `00009-wxn`
(comparativo de dos columnas, reemplaza el diff interlineado ilegible) → `00010-hv2` (reorden del detalle:
flujo → progreso → vista previa). **Revisión vigente: `mibanco-validacion-00010-hv2`.**

---

## 11. Verificación realizada (todo ✅ en producción)

- Health, seed, ambas vistas, los 5 agentes Gemini en vivo (redacción, marca multimodal, legal,
  clasificación, brief), GCS read/write, aprobar→publicar.
- Recorrido de UI con navegador headless (Playwright): render de lista/flujo/modales, sin errores JS.
- Ingesta `.msg` real (FIO y SHIRLEY) por API y por UI; banners descargados y validados.
- Modal unificado: botón solo en Solicitante, creado visible en ambas vistas.
```
