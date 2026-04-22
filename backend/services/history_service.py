import json
import sqlite3
from pathlib import Path
from typing import Dict, List

BASE_DIR = Path(__file__).resolve().parent.parent
DB_PATH = BASE_DIR / "data" / "studyai.db"


def init_db() -> None:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS analyses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                source_name TEXT NOT NULL,
                extracted_chars INTEGER NOT NULL,
                difficulty TEXT NOT NULL,
                payload_json TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        conn.commit()


def save_history(source_name: str, extracted_chars: int, difficulty: str, payload: Dict) -> int:
    with sqlite3.connect(DB_PATH) as conn:
        cur = conn.execute(
            """
            INSERT INTO analyses (source_name, extracted_chars, difficulty, payload_json)
            VALUES (?, ?, ?, ?)
            """,
            (source_name, extracted_chars, difficulty, json.dumps(payload, ensure_ascii=False)),
        )
        conn.commit()
        return int(cur.lastrowid)


def list_history(limit: int = 10) -> List[Dict]:
    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        rows = conn.execute(
            """
            SELECT id, source_name, extracted_chars, difficulty, payload_json, created_at
            FROM analyses
            ORDER BY id DESC
            LIMIT ?
            """,
            (limit,),
        ).fetchall()

    items = []
    for row in rows:
        payload = json.loads(row["payload_json"])
        items.append(
            {
                "id": row["id"],
                "source_name": row["source_name"],
                "difficulty": row["difficulty"],
                "extracted_chars": row["extracted_chars"],
                "created_at": row["created_at"],
                "summary": payload.get("summary", []),
                "quality": payload.get("quality", {}),
            }
        )
    return items
