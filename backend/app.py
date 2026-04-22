import os
import json
import fitz
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

app = Flask(__name__)
CORS(app)

HF_TOKEN = os.getenv("HF_TOKEN")
if not HF_TOKEN:
    raise ValueError("HF_TOKEN est introuvable dans le fichier .env")

client = OpenAI(
    base_url="https://router.huggingface.co/v1",
    api_key=HF_TOKEN,
)

def build_prompt(text: str) -> str:
    return f"""Tu es un assistant pédagogique. Réponds UNIQUEMENT avec un objet JSON valide, rien d'autre.
Pas de markdown, pas de backticks, pas de texte avant ou après.

Retourne EXACTEMENT cette structure JSON :
{{
  "summary": ["phrase clé 1", "phrase clé 2", "phrase clé 3"],
  "quiz": [
    {{
      "question": "Question 1 ?",
      "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
      "correct": 0
    }},
    {{
      "question": "Question 2 ?",
      "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
      "correct": 1
    }},
    {{
      "question": "Question 3 ?",
      "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
      "correct": 2
    }}
  ]
}}

Règles STRICTES :
- summary : EXACTEMENT 3 phrases courtes en français
- quiz : EXACTEMENT 3 questions, chacune avec 4 choix
- correct : index entier 0, 1, 2 ou 3
- Le JSON doit être complet et bien fermé

TEXTE :
{text[:2000]}
"""

def extract_json(raw: str):
    start = raw.find("{")
    end = raw.rfind("}")
    if start == -1 or end == -1 or end <= start:
        raise ValueError("Aucun JSON valide trouvé dans la réponse du modèle.")
    return json.loads(raw[start:end + 1])

@app.route("/", methods=["GET"])
def home():
    return jsonify({"message": "Backend Flask OK"})

@app.route("/analyze", methods=["POST"])
def analyze():
    data = request.get_json(silent=True)

    if not data:
        return jsonify({"error": "Body JSON invalide"}), 400

    text = data.get("text", "")
    if not isinstance(text, str) or not text.strip():
        return jsonify({"error": "Texte vide"}), 400

    try:
        completion = client.chat.completions.create(
            model="openai/gpt-oss-120b:cerebras",
            messages=[
                {"role": "user", "content": build_prompt(text)}
            ],
            max_tokens=1200,
            temperature=0.3,
        )

        raw = completion.choices[0].message.content
        parsed = extract_json(raw)
        return jsonify(parsed), 200

    except Exception as e:
        return jsonify({
            "error": "Erreur serveur",
            "details": str(e)
        }), 500

@app.route("/upload", methods=["POST"])
def upload_file():
    if "file" not in request.files:
        return jsonify({"error": "Aucun fichier"}), 400

    file = request.files["file"]
    filename = (file.filename or "").lower()
    text = ""

    if filename.endswith(".txt"):
        text = file.read().decode("utf-8", errors="ignore")

    elif filename.endswith(".pdf"):
        pdf_bytes = file.read()
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        for page in doc:
            text += page.get_text()
        doc.close()

    else:
        return jsonify({"error": "Format non supporté. Utilise .txt ou .pdf"}), 400

    if not text.strip():
        return jsonify({"error": "Impossible d'extraire le texte"}), 400

    return jsonify({"text": text[:5000]}), 200

if __name__ == "__main__":
    app.run(debug=True, port=5000)