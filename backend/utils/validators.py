from typing import Any, Dict, List


def normalize_output(payload: Dict[str, Any]) -> Dict[str, Any]:
    payload.setdefault("summary", [])
    payload.setdefault("quiz", [])
    payload.setdefault("flashcards", [])
    payload.setdefault("language", "fr")
    payload.setdefault("quality", {"confidence": "medium", "notes": ""})
    return payload


def validate_output(payload: Dict[str, Any]) -> None:
    summary = payload.get("summary")
    quiz = payload.get("quiz")
    flashcards = payload.get("flashcards")
    quality = payload.get("quality")

    if not isinstance(summary, list) or len(summary) != 3 or not all(isinstance(x, str) and x.strip() for x in summary):
        raise ValueError("summary invalide : il faut exactement 3 phrases.")

    if not isinstance(quiz, list) or len(quiz) != 3:
        raise ValueError("quiz invalide : il faut exactement 3 questions.")

    for idx, item in enumerate(quiz, start=1):
        if not isinstance(item, dict):
            raise ValueError(f"Question {idx} invalide.")
        question = item.get("question")
        options = item.get("options")
        correct = item.get("correct")
        explanation = item.get("explanation")

        if not isinstance(question, str) or not question.strip():
            raise ValueError(f"Question {idx} sans texte.")
        if not isinstance(options, list) or len(options) != 4 or not all(isinstance(opt, str) and opt.strip() for opt in options):
            raise ValueError(f"Question {idx} : 4 options obligatoires.")
        if not isinstance(correct, int) or not (0 <= correct <= 3):
            raise ValueError(f"Question {idx} : correct doit être entre 0 et 3.")
        if not isinstance(explanation, str) or not explanation.strip():
            raise ValueError(f"Question {idx} : explanation obligatoire.")

    if not isinstance(flashcards, list) or len(flashcards) != 3:
        raise ValueError("flashcards invalides : il faut exactement 3 cartes.")

    for idx, card in enumerate(flashcards, start=1):
        if not isinstance(card, dict):
            raise ValueError(f"Flashcard {idx} invalide.")
        if not isinstance(card.get("question"), str) or not card["question"].strip():
            raise ValueError(f"Flashcard {idx} : question obligatoire.")
        if not isinstance(card.get("answer"), str) or not card["answer"].strip():
            raise ValueError(f"Flashcard {idx} : answer obligatoire.")

    if payload.get("language") not in {"fr", "en"}:
        raise ValueError("language doit être 'fr' ou 'en'.")

    if not isinstance(quality, dict):
        raise ValueError("quality invalide.")
    if quality.get("confidence") not in {"low", "medium", "high"}:
        raise ValueError("quality.confidence doit être low, medium ou high.")
