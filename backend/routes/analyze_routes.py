from flask import Blueprint, jsonify, request
from services.ai_service import generate_learning_content, generate_new_quiz
from services.file_service import extract_text_from_upload
from services.history_service import list_history, save_history

analyze_bp = Blueprint("analyze_bp", __name__)


@analyze_bp.post("/upload")
def upload_file():
    if "file" not in request.files:
        return jsonify({"error": "Aucun fichier reçu."}), 400

    file = request.files["file"]

    try:
        result = extract_text_from_upload(file)
        return jsonify(result), 200
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    except Exception as exc:
        return jsonify({"error": "Erreur lors de l'extraction du fichier.", "details": str(exc)}), 500


@analyze_bp.post("/analyze")
def analyze_text():
    data = request.get_json(silent=True) or {}
    text = (data.get("text") or "").strip()
    difficulty = (data.get("difficulty") or "medium").strip().lower()
    source_name = (data.get("source_name") or "Texte collé").strip() or "Texte collé"

    if not text:
        return jsonify({"error": "Texte vide. Colle un texte ou importe un fichier."}), 400

    if difficulty not in {"easy", "medium", "hard"}:
        return jsonify({"error": "Difficulté invalide. Valeurs acceptées : easy, medium, hard."}), 400

    try:
        result = generate_learning_content(text=text, difficulty=difficulty)
        history_id = save_history(
            source_name=source_name,
            extracted_chars=len(text),
            difficulty=difficulty,
            payload=result,
        )
        result["history_id"] = history_id
        return jsonify(result), 200
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    except RuntimeError as exc:
        return jsonify({"error": str(exc)}), 502
    except Exception as exc:
        return jsonify({"error": "Erreur interne pendant l'analyse.", "details": str(exc)}), 500


@analyze_bp.post("/generate-quiz")
def generate_quiz_only():
    data = request.get_json(silent=True) or {}
    text = (data.get("text") or "").strip()
    difficulty = (data.get("difficulty") or "medium").strip().lower()

    if not text:
        return jsonify({"error": "Texte vide. Impossible de générer un nouveau quiz."}), 400

    if difficulty not in {"easy", "medium", "hard"}:
        return jsonify({"error": "Difficulté invalide. Valeurs acceptées : easy, medium, hard."}), 400

    try:
        result = generate_new_quiz(text=text, difficulty=difficulty)
        return jsonify(result), 200
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    except RuntimeError as exc:
        return jsonify({"error": str(exc)}), 502
    except Exception as exc:
        return jsonify({"error": "Erreur interne pendant la génération du quiz.", "details": str(exc)}), 500


@analyze_bp.get("/history")
def history():
    try:
        limit = int(request.args.get("limit", 10))
    except ValueError:
        limit = 10

    limit = max(1, min(limit, 50))
    return jsonify({"items": list_history(limit=limit)}), 200