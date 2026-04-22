import os
from typing import Any, Dict

from dotenv import load_dotenv
from openai import OpenAI

from utils.json_parser import extract_json_object
from utils.validators import normalize_output, validate_output

load_dotenv()

API_KEY = os.getenv("HF_TOKEN") or os.getenv("OPENAI_COMPAT_API_KEY")
BASE_URL = os.getenv("OPENAI_COMPAT_BASE_URL", "https://router.huggingface.co/v1")
MODEL_NAME = os.getenv("MODEL_NAME", "openai/gpt-oss-120b:cerebras")

_client = OpenAI(base_url=BASE_URL, api_key=API_KEY) if API_KEY else None

SYSTEM_PROMPT = (
    "Tu es un assistant pédagogique. "
    "Tu dois répondre UNIQUEMENT avec un objet JSON valide, sans markdown, sans texte autour."
)


def _build_full_prompt(text: str, difficulty: str) -> str:
    difficulty_label = {
        "easy": "facile",
        "medium": "moyen",
        "hard": "difficile",
    }.get(difficulty, "moyen")

    return f"""
Analyse le cours ci-dessous et retourne EXACTEMENT un objet JSON valide avec cette structure :
{{
  "summary": ["idée 1", "idée 2", "idée 3"],
  "quiz": [
    {{
      "question": "...",
      "options": ["...", "...", "...", "..."],
      "correct": 0,
      "explanation": "..."
    }},
    {{
      "question": "...",
      "options": ["...", "...", "...", "..."],
      "correct": 1,
      "explanation": "..."
    }},
    {{
      "question": "...",
      "options": ["...", "...", "...", "..."],
      "correct": 2,
      "explanation": "..."
    }}
  ],
  "flashcards": [
    {{"question": "...", "answer": "..."}},
    {{"question": "...", "answer": "..."}},
    {{"question": "...", "answer": "..."}}
  ],
  "language": "fr",
  "quality": {{
    "confidence": "high",
    "notes": "..."
  }}
}}

Règles STRICTES :
- summary : EXACTEMENT 3 phrases courtes et utiles.
- quiz : EXACTEMENT 3 questions.
- chaque question contient EXACTEMENT 4 options.
- correct est un entier entre 0 et 3.
- explanation explique brièvement pourquoi la bonne réponse est correcte.
- flashcards : EXACTEMENT 3 cartes.
- language : "fr" ou "en" selon la langue dominante du texte.
- quality.confidence : "low", "medium" ou "high".
- le niveau du quiz doit être {difficulty_label}.
- n'ajoute aucun commentaire hors JSON.

COURS À ANALYSER :
{text[:9000]}
""".strip()


def _build_quiz_only_prompt(text: str, difficulty: str) -> str:
    difficulty_label = {
        "easy": "facile",
        "medium": "moyen",
        "hard": "difficile",
    }.get(difficulty, "moyen")

    return f"""
À partir du cours ci-dessous, retourne UNIQUEMENT un objet JSON valide avec EXACTEMENT cette structure :
{{
  "quiz": [
    {{
      "question": "...",
      "options": ["...", "...", "...", "..."],
      "correct": 0,
      "explanation": "..."
    }},
    {{
      "question": "...",
      "options": ["...", "...", "...", "..."],
      "correct": 1,
      "explanation": "..."
    }},
    {{
      "question": "...",
      "options": ["...", "...", "...", "..."],
      "correct": 2,
      "explanation": "..."
    }}
  ]
}}

Règles STRICTES :
- génère un NOUVEAU quiz différent du précédent si possible
- quiz : EXACTEMENT 3 questions
- chaque question contient EXACTEMENT 4 options
- correct est un entier entre 0 et 3
- explanation est obligatoire
- niveau : {difficulty_label}
- aucun texte hors JSON

COURS :
{text[:9000]}
""".strip()


def _call_model(prompt: str) -> Dict[str, Any]:
    if _client is None:
        raise RuntimeError(
            "Clé API manquante. Ajoute HF_TOKEN ou OPENAI_COMPAT_API_KEY dans backend/.env"
        )

    completion = _client.chat.completions.create(
        model=MODEL_NAME,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ],
        max_tokens=1800,
        temperature=0.7,
    )

    raw_content = completion.choices[0].message.content or ""
    parsed = extract_json_object(raw_content)
    return parsed


def generate_learning_content(text: str, difficulty: str = "medium") -> Dict[str, Any]:
    cleaned_text = (text or "").strip()
    if len(cleaned_text) < 80:
        raise ValueError("Le texte est trop court pour produire un résumé et un quiz fiables.")

    prompt = _build_full_prompt(cleaned_text, difficulty)

    last_error = None
    for _ in range(2):
        try:
            result = _call_model(prompt)
            normalized = normalize_output(result)
            validate_output(normalized)
            normalized["meta"] = {
                "difficulty": difficulty,
                "input_chars": len(cleaned_text),
                "model": MODEL_NAME,
            }
            return normalized
        except Exception as exc:
            last_error = exc

    raise RuntimeError(f"Échec de génération après 2 tentatives : {last_error}")


def generate_new_quiz(text: str, difficulty: str = "medium") -> Dict[str, Any]:
    cleaned_text = (text or "").strip()
    if len(cleaned_text) < 80:
        raise ValueError("Le texte est trop court pour produire un quiz fiable.")

    prompt = _build_quiz_only_prompt(cleaned_text, difficulty)

    last_error = None
    for _ in range(2):
        try:
            result = _call_model(prompt)
            quiz = result.get("quiz", [])

            if not isinstance(quiz, list) or len(quiz) != 3:
                raise ValueError("Quiz invalide : il faut exactement 3 questions.")

            for idx, item in enumerate(quiz, start=1):
                if not isinstance(item, dict):
                    raise ValueError(f"Question {idx} invalide.")
                question = item.get("question")
                options = item.get("options")
                correct = item.get("correct")
                explanation = item.get("explanation")

                if not isinstance(question, str) or not question.strip():
                    raise ValueError(f"Question {idx} sans texte.")
                if not isinstance(options, list) or len(options) != 4:
                    raise ValueError(f"Question {idx} : 4 options obligatoires.")
                if not isinstance(correct, int) or not (0 <= correct <= 3):
                    raise ValueError(f"Question {idx} : correct doit être entre 0 et 3.")
                if not isinstance(explanation, str) or not explanation.strip():
                    raise ValueError(f"Question {idx} : explanation obligatoire.")

            return {
                "quiz": quiz,
                "meta": {
                    "difficulty": difficulty,
                    "input_chars": len(cleaned_text),
                    "model": MODEL_NAME,
                },
            }
        except Exception as exc:
            last_error = exc

    raise RuntimeError(f"Échec de génération du nouveau quiz après 2 tentatives : {last_error}")