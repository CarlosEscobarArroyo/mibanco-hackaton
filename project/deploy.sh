#!/usr/bin/env bash
# ============================================================
#  deploy.sh — Despliega / actualiza la app Mibanco en Cloud Run
# ------------------------------------------------------------
#  REGLA INQUEBRANTABLE:
#    Lo que SIEMPRE se fija es el PROYECTO: 'mibanco-hackaton'.
#    Si gcloud está en otro proyecto (p. ej. uno corporativo),
#    este script lo cambia y aborta si no lo logra. Bajo ninguna
#    circunstancia despliega en otro proyecto.
#
#  LA CUENTA es la TUYA:
#    Cada miembro del equipo usa SU PROPIA cuenta (la que tenga
#    activa en gcloud), que debe tener permisos en el proyecto.
#    El script NO fuerza ninguna cuenta. Solo usa la que esté activa.
#    (Opcional: 'DEPLOY_ACCOUNT=tu-correo bash deploy.sh' para fijar una.)
#
#  PARA EL EQUIPO (sin experiencia de código):
#    Dile a Claude Code:  "despliega la app corriendo ./deploy.sh"
#    o en una terminal, dentro de la carpeta del proyecto:  bash deploy.sh
#
#  USO:
#    bash deploy.sh           -> construye y despliega/actualiza la app  (lo normal)
#    bash deploy.sh reset     -> reinicia la DEMO al estado inicial (borra lo creado)
#
#  No hace falta editar nada.
# ============================================================
set -euo pipefail

# --- Configuración del proyecto (ya servida — no tocar) ---
PROJECT="mibanco-hackaton"
REGION="us-central1"
SERVICE="mibanco-validacion"
RUNTIME_SA="mibanco-app@mibanco-hackaton.iam.gserviceaccount.com"
BUCKET="mibanco-hackaton-mibanco-uploads"
LOCATION="us-central1"
MODEL="gemini-2.5-flash"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# --- gcloud instalado ---
if ! command -v gcloud >/dev/null 2>&1; then
  echo "❌ No está instalado 'gcloud' (Google Cloud SDK)."
  echo "   Instálalo desde: https://cloud.google.com/sdk/docs/install y reintenta."
  exit 1
fi

# --- Cuenta: la del propio usuario (cada quien la suya) -------------------
# Opcional: fijar una con la variable DEPLOY_ACCOUNT.
if [ -n "${DEPLOY_ACCOUNT:-}" ]; then
  if ! gcloud auth list --format='value(account)' 2>/dev/null | grep -qx "$DEPLOY_ACCOUNT"; then
    echo "❌ La cuenta indicada ($DEPLOY_ACCOUNT) no está logueada en gcloud."
    echo "   Inicia sesión (abre el navegador):   gcloud auth login $DEPLOY_ACCOUNT"
    exit 1
  fi
  gcloud config set account "$DEPLOY_ACCOUNT" >/dev/null
fi

ACTIVE_ACCOUNT="$(gcloud auth list --filter=status:ACTIVE --format='value(account)' 2>/dev/null | head -n1)"
if [ -z "$ACTIVE_ACCOUNT" ]; then
  echo "❌ No hay ninguna cuenta activa en gcloud."
  echo "   Inicia sesión con TU cuenta (debe tener permisos en '$PROJECT'):"
  echo "       gcloud auth login"
  exit 1
fi

# --- Proyecto: SIEMPRE 'mibanco-hackaton' --------------------------------
CUR_PROJECT="$(gcloud config get-value project 2>/dev/null || true)"
if [ -n "$CUR_PROJECT" ] && [ "$CUR_PROJECT" != "$PROJECT" ]; then
  echo "⚠️  gcloud estaba en el proyecto:  $CUR_PROJECT"
  echo "    Se cambia al proyecto OBLIGATORIO:  $PROJECT"
fi
gcloud config set project "$PROJECT" >/dev/null
NOW_PROJECT="$(gcloud config get-value project 2>/dev/null || true)"
if [ "$NOW_PROJECT" != "$PROJECT" ]; then
  echo "❌ No se pudo fijar el proyecto '$PROJECT' (quedó '$NOW_PROJECT'). Aborto por seguridad."
  exit 1
fi
echo "✅ Proyecto: $PROJECT   |   Cuenta: $ACTIVE_ACCOUNT"

ACTION="${1:-deploy}"

# --- Modo RESET: reinicia la demo al seed (sin reconstruir) ---
if [ "$ACTION" = "reset" ]; then
  STAMP="reset-$(date +%Y%m%d-%H%M%S)"
  echo "▶ Reiniciando la demo al estado inicial (etiqueta $STAMP)…"
  gcloud run services update "$SERVICE" --project "$PROJECT" --region "$REGION" \
    --update-labels "demo=$STAMP" >/dev/null
  echo "✅ Demo reiniciada: la app vuelve a las solicitudes del seed."
  exit 0
fi

if [ "$ACTION" != "deploy" ]; then
  echo "❓ Acción no reconocida: '$ACTION'."
  echo "   Usa:  bash deploy.sh   (desplegar)   |   bash deploy.sh reset   (reiniciar demo)"
  exit 1
fi

# --- Deploy / actualización ---
# El '--project' va EXPLÍCITO: aunque algo cambiara la config, el deploy solo
# puede ir a 'mibanco-hackaton'.
echo "▶ Desplegando '$SERVICE' en '$PROJECT' ($REGION). Tarda ~3-5 min, no cierres la terminal…"
if ! gcloud run deploy "$SERVICE" \
  --source . \
  --project "$PROJECT" \
  --region "$REGION" \
  --allow-unauthenticated \
  --min-instances=1 --max-instances=1 \
  --memory 1Gi --cpu 1 --timeout 300 \
  --service-account "$RUNTIME_SA" \
  --set-env-vars "GOOGLE_CLOUD_PROJECT=$PROJECT,GOOGLE_CLOUD_LOCATION=$LOCATION,GEMINI_MODEL=$MODEL,STORAGE_BACKEND=gcs,GCS_BUCKET=$BUCKET" \
  --quiet
then
  echo
  echo "❌ El deploy falló."
  echo "   Si fue por PERMISOS, tu cuenta ($ACTIVE_ACCOUNT) necesita en el proyecto '$PROJECT':"
  echo "     • roles/run.developer            (desplegar en Cloud Run)"
  echo "     • roles/iam.serviceAccountUser   sobre $RUNTIME_SA"
  echo "     • roles/cloudbuild.builds.editor y roles/artifactregistry.writer"
  echo "   Pídele al dueño del proyecto que te los conceda (ver DEPLOY.md → Permisos)."
  exit 1
fi

URL="$(gcloud run services describe "$SERVICE" --project "$PROJECT" --region "$REGION" --format='value(status.url)')"
echo
echo "✅ Deploy completado en el proyecto: $PROJECT"
echo "   App:  $URL"

# --- Verificación de salud ---
echo "▶ Verificando que la app responda…"
if curl -fsS -m 30 "$URL/api/health" >/dev/null 2>&1; then
  echo "✅ La app está en línea (/api/health OK)."
else
  echo "⚠️  Se desplegó, pero /api/health aún no respondió. Espera ~30s y abre la URL en el navegador."
  echo "    Si los agentes de IA fallan, falta el permiso de Vertex AI (ver DEPLOY.md → Solución de problemas)."
fi
