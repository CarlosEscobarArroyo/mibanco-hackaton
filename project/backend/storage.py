"""
Abstracción de almacenamiento de imágenes.

- STORAGE_BACKEND=gcs  -> sube cada imagen por separado a un bucket de Google Cloud Storage.
- STORAGE_BACKEND=local -> guarda en ./uploads (fallback para desarrollo).

En el registro en memoria de la solicitud SOLO se guarda la referencia (storage_id + gcsPath),
nunca el binario. El binario se sirve bajo demanda por /api/imagenes/{storage_id}.
"""
import os
import uuid
from pathlib import Path

STORAGE_BACKEND = os.getenv("STORAGE_BACKEND", "local").lower()
GCS_BUCKET = os.getenv("GCS_BUCKET", "")
LOCAL_DIR = Path(os.getenv("LOCAL_UPLOAD_DIR", "./uploads"))

_gcs_client = None


def _client():
    global _gcs_client
    if _gcs_client is None:
        from google.cloud import storage  # import perezoso
        _gcs_client = storage.Client()
    return _gcs_client


def guardar_imagen(data: bytes, nombre: str, content_type: str = "image/png"):
    """Guarda la imagen y devuelve (storage_id, ruta_referencia)."""
    ext = os.path.splitext(nombre)[1].lower() or ".png"
    storage_id = f"{uuid.uuid4().hex}{ext}"
    if STORAGE_BACKEND == "gcs":
        blob = _client().bucket(GCS_BUCKET).blob(f"uploads/{storage_id}")
        blob.upload_from_string(data, content_type=content_type or "image/png")
        return storage_id, f"gs://{GCS_BUCKET}/uploads/{storage_id}"
    LOCAL_DIR.mkdir(parents=True, exist_ok=True)
    (LOCAL_DIR / storage_id).write_bytes(data)
    return storage_id, str((LOCAL_DIR / storage_id).resolve())


def leer_imagen(storage_id: str) -> bytes:
    """Lee los bytes de una imagen previamente guardada."""
    if STORAGE_BACKEND == "gcs":
        blob = _client().bucket(GCS_BUCKET).blob(f"uploads/{storage_id}")
        return blob.download_as_bytes()
    return (LOCAL_DIR / storage_id).read_bytes()


def info_backend() -> dict:
    return {"backend": STORAGE_BACKEND, "bucket": GCS_BUCKET if STORAGE_BACKEND == "gcs" else str(LOCAL_DIR)}
