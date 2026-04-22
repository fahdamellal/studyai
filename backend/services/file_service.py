import io
from typing import Dict

import fitz

MAX_FILE_SIZE = 8 * 1024 * 1024  # 8 MB
ALLOWED_EXTENSIONS = {".txt", ".pdf"}


def _get_extension(filename: str) -> str:
    filename = (filename or "").lower().strip()
    if "." not in filename:
        return ""
    return filename[filename.rfind("."):]


def extract_text_from_upload(file_storage) -> Dict:
    filename = (file_storage.filename or "").strip()
    if not filename:
        raise ValueError("Nom de fichier introuvable.")

    ext = _get_extension(filename)
    if ext not in ALLOWED_EXTENSIONS:
        raise ValueError("Format non supporté. Utilise un fichier .txt ou .pdf.")

    raw_bytes = file_storage.read()
    if not raw_bytes:
        raise ValueError("Le fichier est vide.")

    if len(raw_bytes) > MAX_FILE_SIZE:
        raise ValueError("Fichier trop volumineux. Taille maximale autorisée : 8 MB.")

    text = ""
    if ext == ".txt":
        text = raw_bytes.decode("utf-8", errors="ignore")
    elif ext == ".pdf":
        text = _extract_pdf_text(raw_bytes)

    text = (text or "").strip()
    if not text:
        raise ValueError("Impossible d'extraire du texte. Le PDF est peut-être scanné ou vide.")

    return {
        "filename": filename,
        "file_type": ext,
        "file_size": len(raw_bytes),
        "text": text[:15000],
        "extracted_chars": len(text),
        "warning": None if len(text) >= 120 else "Texte très court : les résultats peuvent être moins fiables.",
    }


def _extract_pdf_text(pdf_bytes: bytes) -> str:
    text_parts = []
    with fitz.open(stream=io.BytesIO(pdf_bytes), filetype="pdf") as doc:
        for page in doc:
            text_parts.append(page.get_text("text"))
    return "\n".join(text_parts)
