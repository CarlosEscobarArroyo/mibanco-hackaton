# Cómo desplegar la app (guía rápida)

Esta app vive en Google Cloud Run, en el proyecto **`mibanco-hackaton`**.
Para subir cambios o reiniciar la demo **no necesitas saber programar**: usa el script `deploy.sh`.

> 🔒 **Regla inquebrantable — el PROYECTO siempre es `mibanco-hackaton`.**
> Si tu gcloud está en otro proyecto (por ejemplo, uno **corporativo**), `deploy.sh` lo **cambia
> automáticamente** a `mibanco-hackaton` y aborta si no lo logra. **Bajo ninguna circunstancia
> se despliega en otro proyecto.**
>
> 👤 **La CUENTA es la tuya.** Cada persona del equipo usa **su propia cuenta** de Google (la que
> tenga activa en gcloud), que debe tener **permisos en el proyecto** (ver *Permisos* más abajo).
> El script **no** cambia tu cuenta: usa la que tengas activa.

---

## La forma más fácil: pedírselo a Claude Code

Abre Claude Code en la carpeta del proyecto y escríbele:

> **"Despliega la app corriendo `./deploy.sh`"**

o, para reiniciar la demo al estado inicial:

> **"Reinicia la demo corriendo `./deploy.sh reset`"**

Claude Code ejecutará el script y te dirá la URL final.

---

## A mano (si prefieres la terminal)

Dentro de la carpeta `project/`:

```bash
bash deploy.sh          # sube los cambios actuales (tarda ~3-5 min)
bash deploy.sh reset    # reinicia la demo: borra lo creado y vuelve a las solicitudes de ejemplo
```

Al terminar, el script imprime la **URL de la app** y verifica que esté en línea.

**App en vivo:** https://mibanco-validacion-902536648823.us-central1.run.app

---

## ¿Qué hace `deploy.sh`?

Tiene **todo preconfigurado** (proyecto, región, cuenta de servicio, bucket, modelo). En orden:

1. Comprueba que `gcloud` esté instalado y que tengas una cuenta activa.
2. **Fija el proyecto `mibanco-hackaton`** (lo cambia si estabas en otro). Usa **tu** cuenta activa.
3. Construye la imagen (Cloud Build) y la despliega/actualiza en Cloud Run.
4. Imprime la URL y verifica `/api/health`.

No hay que editar nada del script para el uso normal.

---

## Requisitos (una sola vez por computadora)

- Tener instalado el **Google Cloud SDK** (`gcloud`): https://cloud.google.com/sdk/docs/install
- Iniciar sesión con **tu** cuenta (la que tenga permisos en el proyecto):
  ```bash
  gcloud auth login
  ```

Si falta algo, el script te lo dice con un mensaje claro antes de empezar.

> ¿Tienes varias cuentas y quieres asegurar cuál usar? `DEPLOY_ACCOUNT=tu-correo@dominio bash deploy.sh`.

---

## Permisos que necesita tu cuenta (los concede el dueño del proyecto)

Para que tu cuenta pueda desplegar, el **dueño** (`carlos.escobar.arroyo@gmail.com`) debe concederte,
en el proyecto `mibanco-hackaton`, estos roles (reemplaza `TU-CORREO`):

```bash
# 1) Desplegar/actualizar en Cloud Run
gcloud projects add-iam-policy-binding mibanco-hackaton \
  --member="user:TU-CORREO" --role="roles/run.developer" --condition=None

# 2) Lanzar el build (Cloud Build) y guardar la imagen
gcloud projects add-iam-policy-binding mibanco-hackaton \
  --member="user:TU-CORREO" --role="roles/cloudbuild.builds.editor" --condition=None
gcloud projects add-iam-policy-binding mibanco-hackaton \
  --member="user:TU-CORREO" --role="roles/artifactregistry.writer" --condition=None

# 3) Permitir que tu deploy "actúe como" la cuenta de servicio del runtime
gcloud iam service-accounts add-iam-policy-binding \
  mibanco-app@mibanco-hackaton.iam.gserviceaccount.com \
  --member="user:TU-CORREO" --role="roles/iam.serviceAccountUser"
```

(Atajo rápido para un hackatón: en vez de los 4, el dueño puede darte `roles/editor` + el punto 3.)

---

## Solución de problemas

- **"No hay ninguna cuenta activa"** → corre `gcloud auth login` con tu cuenta y reintenta.
- **"gcloud no está instalado"** → instala el SDK (enlace de arriba) y reintenta.
- **El deploy falla con "permission denied" / 403** → tu cuenta no tiene permisos en el proyecto.
  Pídele al dueño que te conceda los roles de la sección *Permisos*.
- **La app abre, pero los agentes de IA dan error 500/403** → falta darle permiso de Vertex AI
  a la cuenta de servicio. Lo corre **una sola vez** el dueño del proyecto:
  ```bash
  gcloud projects add-iam-policy-binding mibanco-hackaton \
    --member="serviceAccount:mibanco-app@mibanco-hackaton.iam.gserviceaccount.com" \
    --role="roles/aiplatform.user" --condition=None
  ```
- **El deploy tarda mucho** → es normal: la primera vez ~5 min, las siguientes ~3 min. No cierres la terminal.
