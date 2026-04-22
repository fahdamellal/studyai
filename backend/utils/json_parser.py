import json
from typing import Any, Dict


def extract_json_object(raw: str) -> Dict[str, Any]:
    if not isinstance(raw, str) or not raw.strip():
        raise ValueError("Réponse vide du modèle.")

    start = raw.find("{")
    end = raw.rfind("}")
    if start == -1 or end == -1 or end <= start:
        raise ValueError("Aucun JSON exploitable trouvé dans la réponse du modèle.")

    candidate = raw[start:end + 1]
    try:
        return json.loads(candidate)
    except json.JSONDecodeError as exc:
        raise ValueError(f"JSON invalide renvoyé par le modèle : {exc}") from exc
