# Cambiar de cuenta en gcloud (guía rápida)

En gcloud hay **3 credenciales independientes**. Al pasar de una cuenta a otra,
cámbialas las 3 y no se te escapa nada.

| Credencial | La usa | Verla / cambiarla |
|---|---|---|
| **Cuenta del CLI** | los comandos `gcloud` (deploy, builds, etc.) | `gcloud auth list` · `gcloud config set account` |
| **Proyecto** | los comandos `gcloud` | `gcloud config get-value project` · `gcloud config set project` |
| **ADC** | tu **código** y scripts (`google.auth.default()`) | `gcloud auth application-default login` |

> **Regla de oro:** la cuenta del CLI y el ADC son **independientes**. Cambiar una NO
> cambia la otra. Por eso siempre se tocan las tres.

---

## Cambiar de cuenta (cuenta ya logueada en esta máquina)

```bash
# 1) Cuenta del CLI -> comandos gcloud (deploy, builds, etc.)
gcloud config set account <TU_CUENTA>

# 2) Proyecto por defecto
gcloud config set project <TU_PROYECTO>

# 3) ADC -> tu código y scripts (google.auth.default)
gcloud auth application-default login
#   Si tu código toca Drive/Sheets/etc., agrégale los scopes, p. ej.:
#   gcloud auth application-default login --scopes=openid,\
#     https://www.googleapis.com/auth/cloud-platform,\
#     https://www.googleapis.com/auth/drive.readonly,\
#     https://www.googleapis.com/auth/spreadsheets
```

## Verificar que quedó bien

```bash
gcloud auth list                      # el * marca la cuenta activa del CLI
gcloud config get-value project       # el proyecto activo
gcloud auth application-default print-access-token >/dev/null && echo "ADC OK"
```

## Si la cuenta nunca se logueó en esta máquina

`config set account` solo sirve para cuentas **ya logueadas**. Si es nueva, primero:

```bash
gcloud auth login                      # loguea la cuenta en el CLI (abre navegador)
gcloud auth application-default login  # loguea el ADC (abre navegador)
```

Después ya puedes alternar con `config set account` sin volver a abrir navegador.

---

## Notas que es fácil olvidar

- **WSL / sin navegador:** el `application-default login` imprime una URL; cópiala y
  ábrela en el navegador de Windows, luego pega el código.
- **Quota project:** si ves el warning de "quota project", fíjalo con:
  `gcloud auth application-default set-quota-project <TU_PROYECTO>`.
- **Scripts vs deploy:** los scripts/código usan el **ADC**; el deploy (`gcloud ...`)
  usa la **cuenta del CLI**. Pueden estar en cuentas distintas a la vez (por eso un
  script funciona aunque `gcloud auth list` muestre otra cuenta activa).
