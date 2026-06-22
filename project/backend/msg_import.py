"""
Ingesta de correos reales de Outlook (.msg) para el Paso 1.

Parsea un archivo .msg (formato CDFV2/OLE) y extrae:
  - asunto      -> título
  - remitente   -> remitente
  - fecha       -> fecha
  - cuerpo      -> contenido (texto limpio)
  - imágenes    -> adjuntos embebidos (cid) + banners referenciados por URL en el HTML

Las imágenes se descargan (las externas) o se leen (las adjuntas) y se devuelven como bytes
listos para subir a GCS y validar con el agente de marca (Paso 3).
"""
import os
import re
import ssl
import tempfile
import urllib.request
from datetime import datetime

# Prioriza el banner HERO (imagen principal de la pieza) sobre la tira de header/footer y los íconos.
_HERO = ["banner", "hero", "principal", "mailing", "mail_"]
_SECUNDARIO = ["header", "footer", "compromoso"]
_EXT_IMG = re.compile(r"\.(png|jpe?g|gif|webp)(\?|$)", re.I)
_UA = "Mozilla/5.0 (compatible; MibancoValidador/1.0)"


def _decode_html(html):
    if isinstance(html, (bytes, bytearray)):
        return html.decode("utf-8", "ignore")
    return html or ""


# Marcadores del pie legal/administrativo: el cuerpo de marketing termina aquí.
_PIE_MARCADORES = (
    "en virtud de lo establecido",
    "este mensaje fue enviado por",
    "quiero desuscribirme",
    "sender validado",
    "el sistema de correo electrónico de mibanco",
    "av. republica de panama",
    "av. república de panamá",
    "trusted sender",
)


def _limpiar_cuerpo(texto: str) -> str:
    lineas = []
    for ln in (texto or "").splitlines():
        s = ln.strip()
        if not s:
            lineas.append("")
            continue
        if any(mk in s.lower() for mk in _PIE_MARCADORES):  # corta el pie legal/footer
            break
        if re.fullmatch(r"<?\s*https?://\S+\s*>?", s):  # línea que es solo una URL
            continue
        if s.lower() in ("ver en mi navegador", "ver en navegador", "view in browser"):
            continue
        # quita URLs incrustadas en medio del texto pero conserva el texto
        s = re.sub(r"<https?://\S+>", "", s).strip()
        if s:
            lineas.append(s)
    # colapsa líneas en blanco consecutivas
    out, prev_blank = [], False
    for ln in lineas:
        blank = ln == ""
        if blank and prev_blank:
            continue
        out.append(ln)
        prev_blank = blank
    return "\n".join(out).strip()


def _nombre_remitente(sender: str) -> str:
    if not sender:
        return "Correo entrante"
    m = re.match(r"\s*([^<]+?)\s*<", sender)
    return (m.group(1).strip() if m else sender.strip()) or "Correo entrante"


def _fecha(dt) -> str:
    try:
        if isinstance(dt, datetime):
            return dt.strftime("%d/%m/%Y")
        return datetime.now().strftime("%d/%m/%Y")
    except Exception:
        return datetime.now().strftime("%d/%m/%Y")


def _urls_imagenes(html: str):
    urls = re.findall(r'<img[^>]+src=["\']([^"\']+)["\']', html or "", re.I)
    seen, hero, sec, rest = set(), [], [], []
    for u in urls:
        if not u.lower().startswith("http"):
            continue
        if not _EXT_IMG.search(u):
            continue
        if u in seen:
            continue
        seen.add(u)
        nombre = u.split("/")[-1].split("?")[0].lower()
        if any(k in nombre for k in _HERO):
            hero.append(u)
        elif any(k in nombre for k in _SECUNDARIO):
            sec.append(u)
        else:
            rest.append(u)
    return hero + sec + rest


_MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"]


def _fecha_larga(dt) -> str:
    """Fecha legible tipo '28 abr 2026, 16:14' para la cabecera del preview."""
    try:
        if isinstance(dt, datetime):
            return f"{dt.day} {_MESES[dt.month - 1]} {dt.year}, {dt.strftime('%H:%M')}"
    except Exception:
        pass
    return _fecha(dt)


def _email_remitente(sender: str) -> str:
    m = re.search(r"<([^>]+@[^>]+)>", sender or "")
    return (m.group(1).strip() if m else "") or "comunicaciones@mibanco.com.pe"


def _saludo(texto: str) -> str:
    """Primera línea del cuerpo si es un saludo ('Hola, SHIRLEY'), si no, vacío."""
    for ln in (texto or "").splitlines():
        s = ln.strip()
        if not s:
            continue
        if re.match(r"^(hola|estimad[oa]s?|buen[oa]s|hey)\b", s, re.I):
            return s.rstrip(" .")
        return ""
    return ""


def _sanitizar_html_correo(html: str) -> str:
    """Limpia el HTML del correo para previsualizarlo de forma segura en un iframe sandbox.

    - Elimina <script>, comentarios condicionales MSO, <title>, <meta> de reformateo y <o:...>.
    - Neutraliza enlaces (quita href/target/on*) para que el preview sea totalmente inerte.
    - Colapsa las largas corridas de <p></p> vacíos que Outlook inserta.
    Conserva imágenes (URLs del CDN público de emblue), texto y estilos inline (look real).
    """
    h = html or ""
    h = re.sub(r"<!--.*?-->", "", h, flags=re.S)               # comentarios + condicionales [if mso]
    h = re.sub(r"<script[\s\S]*?</script>", "", h, flags=re.I)
    h = re.sub(r"<title[\s\S]*?</title>", "", h, flags=re.I)
    h = re.sub(r"<xml[\s\S]*?</xml>", "", h, flags=re.I)
    h = re.sub(r"</?o:[^>]*>", "", h, flags=re.I)               # tags Office (o:OfficeDocumentSettings…)
    h = re.sub(r'\s(?:href|originalsrc|target)\s*=\s*("[^"]*"|\'[^\']*\'|\S+)', "", h, flags=re.I)
    h = re.sub(r'\son\w+\s*=\s*("[^"]*"|\'[^\']*\'|\S+)', "", h, flags=re.I)
    h = re.sub(r"(?:\s*<p\b[^>]*>(?:\s|&nbsp;|<br\s*/?>)*</p>\s*){2,}", "\n", h, flags=re.I)
    return h.strip()


def _preview_email(asunto: str, m, cuerpo: str, urls_imgs) -> dict:
    """Modelo estructurado para el mockup de correo del frontend (cabecera + banner + cuerpo)."""
    return {
        "kind": "email",
        "asunto": asunto,
        "remitenteNombre": _nombre_remitente(m.sender),
        "remitenteEmail": _email_remitente(m.sender),
        "para": (getattr(m, "to", None) or "").strip() or "Cliente Mibanco",
        "fecha": _fecha_larga(getattr(m, "date", None)),
        "saludo": _saludo(cuerpo),
        "cuerpo": cuerpo,
        "bannerUrlCdn": (urls_imgs[0] if urls_imgs else None),
        "bannerUrl": None,           # lo resuelve main.py al banner ya descargado/proxeado
        "imagenesCdn": list(urls_imgs or []),
    }


def _contextos_ssl():
    """Contextos SSL en orden de preferencia, robusto entre entornos (macOS sin certs, etc.)."""
    ctxs = []
    try:
        import certifi
        ctxs.append(ssl.create_default_context(cafile=certifi.where()))
    except Exception:
        pass
    ctxs.append(None)  # contexto por defecto del sistema
    try:
        ctxs.append(ssl._create_unverified_context())  # último recurso
    except Exception:
        pass
    return ctxs


def _descargar(url: str, timeout: int = 12):
    req = urllib.request.Request(url, headers={"User-Agent": _UA})
    last = None
    for ctx in _contextos_ssl():
        try:
            with urllib.request.urlopen(req, timeout=timeout, context=ctx) as r:
                return r.read(), (r.headers.get("Content-Type", "") or "")
        except Exception as e:
            last = e
            continue
    raise last if last else RuntimeError("descarga fallida")


def _mime_por_nombre(nombre: str, ct: str = "") -> str:
    if ct and ct.startswith("image/"):
        return ct
    ext = os.path.splitext(nombre)[1].lower()
    return {".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
            ".gif": "image/gif", ".webp": "image/webp"}.get(ext, "image/png")


def parse_msg(file_bytes: bytes, max_imgs: int = 3, area: str = "Marketing") -> dict:
    """Parsea el .msg y devuelve los datos + imágenes (bytes) listas para guardar."""
    import extract_msg

    tmp = tempfile.NamedTemporaryFile(suffix=".msg", delete=False)
    try:
        tmp.write(file_bytes)
        tmp.flush()
        tmp.close()
        m = extract_msg.Message(tmp.name)

        asunto = (m.subject or "Correo sin asunto").strip()
        # quita prefijos tipo "Test:" para un título más limpio
        titulo = re.sub(r"^\s*(test|fwd|re)\s*:\s*", "", asunto, flags=re.I).strip() or asunto
        html = _decode_html(m.htmlBody)
        cuerpo = _limpiar_cuerpo(m.body or "")

        imagenes = []
        # 1) adjuntos embebidos que sean imágenes
        for a in (m.attachments or []):
            data = getattr(a, "data", None)
            if not isinstance(data, (bytes, bytearray)):
                continue
            nombre = getattr(a, "longFilename", None) or getattr(a, "shortFilename", None) or "adjunto"
            mt = getattr(a, "mimetype", "") or _mime_por_nombre(nombre)
            if not str(mt).startswith("image/"):
                continue
            imagenes.append({"nombre": nombre, "mime": mt, "data": bytes(data), "origen": "adjunto"})

        # 2) imágenes referenciadas por URL en el HTML (banners externos)
        urls = _urls_imagenes(html)
        descargadas, fallidas = 0, 0
        for u in urls:
            if len(imagenes) >= max_imgs:
                break
            try:
                data, ct = _descargar(u)
                if len(data) < 1500:  # descarta pixeles de tracking / íconos diminutos
                    continue
                nombre = u.split("/")[-1].split("?")[0] or "imagen.png"
                imagenes.append({"nombre": nombre, "mime": _mime_por_nombre(nombre, ct),
                                 "data": data, "origen": u})
                descargadas += 1
            except Exception:
                fallidas += 1
                continue

        preview = _preview_email(asunto, m, cuerpo or asunto, urls)

        return {
            "titulo": titulo,
            "asunto": asunto,
            "remitente": _nombre_remitente(m.sender),
            "fecha": _fecha(m.date),
            "tipo": "Email",
            "area": area,
            "contenido": cuerpo or asunto,
            "imagenes": imagenes,
            "correoHtml": _sanitizar_html_correo(html),
            "preview": preview,
            "meta": {"urls_detectadas": len(urls), "imagenes_descargadas": descargadas, "fallidas": fallidas},
        }
    finally:
        try:
            os.unlink(tmp.name)
        except Exception:
            pass
