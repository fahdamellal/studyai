# StudyAI v2

Version améliorée de ton ancien projet `studyai`, en gardant le même stack :
- **Backend** : Flask
- **Frontend** : HTML / CSS / JavaScript
- **IA** : endpoint OpenAI-compatible via Hugging Face Router
- **DB locale** : SQLite

## Nouvelles améliorations
- architecture backend séparée par fichiers
- endpoint `/health`
- validation stricte du JSON IA
- retry automatique si la réponse est invalide
- flashcards
- explications des réponses du quiz
- historique SQLite des analyses
- upload `.pdf` / `.txt` sécurisé
- frontend plus moderne avec drag & drop, progression et historique

## Structure

```text
studyai_v2/
  backend/
    app.py
    routes/analyze_routes.py
    services/
    utils/
    data/studyai.db
  frontend/
    index.html
    script.js
    style.css
```

## Installation backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

Ensuite remplis `backend/.env` avec ta clé :

```env
HF_TOKEN=ton_token
OPENAI_COMPAT_BASE_URL=https://router.huggingface.co/v1
MODEL_NAME=openai/gpt-oss-120b:cerebras
```

## Lancer le backend

```bash
cd backend
python app.py
```

Backend : `http://127.0.0.1:5000`

## Lancer le frontend

Tu peux ouvrir `frontend/index.html` directement dans le navigateur.

Pour éviter certains soucis CORS/file, le mieux est :

```bash
cd frontend
python -m http.server 5500
```

Puis ouvrir :

`http://127.0.0.1:5500`

## Notes importantes
- si le PDF est scanné en image pure, l'extraction texte peut échouer
- si le texte est trop court, le backend refuse l'analyse pour éviter des résultats faibles
- l'historique est stocké dans `backend/data/studyai.db`
