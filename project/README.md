# Mibanco · Validación de Comunicaciones (MVP)

Aplicación full-stack en **un único servicio** (backend + frontend en el mismo contenedor) que
automatiza la validación de comunicaciones de Mibanco con **agentes de IA (Gemini en Vertex AI)**.

- **Backend:** Python + FastAPI. Sirve la API REST y el frontend compilado.
- **Frontend:** React + Vite (estáticos servidos por FastAPI desde `/`).
- **IA:** Gemini en Vertex AI (`google-genai` con `vertexai=True`), autenticación por ADC / service account.
- **Datos estructurados:** en memoria (RAM), sin base de datos. Se pierden al reiniciar (es un MVP de demo).
- **Imágenes:** Google Cloud Storage (una por una), o carpeta local `./uploads` en desarrollo.

## Flujo de 5 pasos

1. **Recepción** (auto `ok`, dispara paso 2)
2. **Validación de redacción** (Agente IA): tono, claridad, simplicidad, formato por canal.
3. **Validación de marca/imágenes** (Agente IA multimodal): branding de cada imagen.
4. **Validación legal y cumplimiento** (Agente IA + ajuste del solicitante).
5. **Brief + Aprobación CX** (brief automático; CX aprueba; solicitante publica).

Regla transversal: piezas de **reclamos, crisis u ofertas comerciales** se marcan para **revisión humana obligatoria**.

Dos vistas: **CX** (ve todas, aprueba en paso 5) y **Solicitante** (ve las suyas, atiende observaciones).

## Variables de entorno

| Variable | Descripción | Ejemplo |
|---|---|---|
| `GOOGLE_CLOUD_PROJECT` | Proyecto GCP | `glamour-peru-dw` |
| `GOOGLE_CLOUD_LOCATION` | Región de Vertex AI | `us-central1` |
| `GEMINI_MODEL` | Modelo Gemini multimodal | `gemini-2.5-flash` |
| `STORAGE_BACKEND` | `gcs` o `local` | `gcs` |
| `GCS_BUCKET` | Bucket de imágenes (si `gcs`) | `glamour-peru-dw-mibanco-uploads` |
| `STATIC_DIR` | Carpeta de estáticos (auto en Docker) | `/app/static` |
| `PORT` | Puerto (lo fija Cloud Run) | `8080` |

## Correr en local

Backend (terminal 1):
```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
export GOOGLE_CLOUD_PROJECT=glamour-peru-dw
export GOOGLE_CLOUD_LOCATION=us-central1
export GEMINI_MODEL=gemini-2.5-flash
export STORAGE_BACKEND=local
gcloud auth application-default login   # ADC para Vertex AI
uvicorn main:app --reload --port 8080
```

Frontend (terminal 2):
```bash
cd frontend
npm install
npm run dev   # http://localhost:5173 (proxy /api -> :8080)
```

## Deploy a Cloud Run (una sola imagen, vía Cloud Build)

```bash
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

> `--min-instances=1 --max-instances=1` garantiza una única instancia (el estado vive en RAM).
> El service account `aurora-agent-app@` tiene `roles/aiplatform.user` (Vertex AI) y `roles/storage.objectAdmin` sobre el bucket.

## Endpoints

```
POST   /api/solicitudes                      crea (paso 1) + dispara paso 2
POST   /api/solicitudes/importar             multipart: correo Outlook .msg -> crea solicitud + valida
GET    /api/solicitudes?vista=cx|sol&area=   lista
GET    /api/solicitudes/{id}                 detalle + estados
POST   /api/solicitudes/{id}/paso2/aceptar   acepta corrección IA
POST   /api/solicitudes/{id}/paso2/revalidar {contenido}
POST   /api/solicitudes/{id}/paso3/imagen    multipart: nueva imagen -> revalida
POST   /api/solicitudes/{id}/paso4/revalidar {contenido}
POST   /api/solicitudes/{id}/paso4/aceptar   acepta ajuste legal
GET    /api/solicitudes/{id}/brief           brief (paso 5)
POST   /api/solicitudes/{id}/aprobar         CX aprueba
POST   /api/solicitudes/{id}/publicar        solicitante publica
GET    /api/imagenes/{storage_id}            sirve el binario de una imagen
GET    /api/health                           salud + modelo + storage
```

## Seed

Al arrancar se cargan 5 solicitudes en distintos estados (paso 2 observado, paso 3 con imagen
observada, paso 4 legal observado, paso 5 esperando CX, y una aprobada) para demostrar el flujo
de inmediato. Las solicitudes **nuevas** ejecutan los agentes Gemini en vivo.
