import sqlite3
import os
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from contextlib import contextmanager

class DatabaseService:
    def __init__(self, db_path: Optional[str] = None):
        if db_path is None:
            base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            db_path = os.path.join(base_dir, "darkguard.db")
        self.db_path = db_path
        self.init_db()

    @contextmanager
    def _connection(self):
        """Context manager that ensures the SQLite connection is committed and properly closed."""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        try:
            yield conn
        finally:
            conn.close()

    def init_db(self):
        """Creates table and indices if they do not exist."""
        with self._connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS detections (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp TEXT NOT NULL,
                    page_url TEXT,
                    domain TEXT,
                    source_type TEXT NOT NULL,
                    candidate_text TEXT NOT NULL,
                    context TEXT,
                    category TEXT NOT NULL,
                    confidence REAL NOT NULL,
                    model_version TEXT DEFAULT 'darkguard-bert-final',
                    review_status TEXT DEFAULT 'unreviewed',
                    corrected_label TEXT,
                    reviewer_notes TEXT
                )
            """)
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_review_status ON detections(review_status)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_category ON detections(category)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_domain ON detections(domain)")
            conn.commit()

    def log_detection(
        self,
        candidate_text: str,
        category: str,
        confidence: float,
        source_type: str = "text",
        context: Optional[str] = None,
        page_url: Optional[str] = None,
        domain: Optional[str] = None,
        model_version: str = "darkguard-bert-final"
    ) -> int:
        """Logs a single detected dark pattern."""
        now_iso = datetime.now(timezone.utc).isoformat()
        with self._connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO detections (
                    timestamp, page_url, domain, source_type,
                    candidate_text, context, category, confidence,
                    model_version, review_status
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'unreviewed')
            """, (
                now_iso, page_url, domain, source_type,
                candidate_text, context, category, confidence,
                model_version
            ))
            conn.commit()
            return cursor.lastrowid

    def log_detections_batch(
        self,
        page_url: str,
        detections: List[Dict[str, Any]],
        domain: Optional[str] = None
    ) -> int:
        """Batch inserts multiple detected patterns in a single atomic transaction."""
        now_iso = datetime.now(timezone.utc).isoformat()
        rows = []
        for d in detections:
            cat = d.get("category")
            if not cat or cat == "Not Dark Pattern":
                continue
            rows.append((
                now_iso,
                page_url,
                domain or d.get("domain"),
                d.get("source_type", "text"),
                d.get("candidate_text", ""),
                d.get("context"),
                cat,
                float(d.get("confidence", 0.95)),
                d.get("model_version", "darkguard-bert-final"),
                "unreviewed"
            ))

        if not rows:
            return 0

        with self._connection() as conn:
            cursor = conn.cursor()
            cursor.executemany("""
                INSERT INTO detections (
                    timestamp, page_url, domain, source_type,
                    candidate_text, context, category, confidence,
                    model_version, review_status
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, rows)
            conn.commit()
            return len(rows)

    def get_detections(
        self,
        review_status: Optional[str] = None,
        category: Optional[str] = None,
        domain: Optional[str] = None,
        limit: int = 50,
        offset: int = 0
    ) -> List[Dict[str, Any]]:
        """Retrieves detections with optional filtering."""
        query = "SELECT * FROM detections WHERE 1=1"
        params = []

        if review_status:
            query += " AND review_status = ?"
            params.append(review_status)
        if category:
            query += " AND category = ?"
            params.append(category)
        if domain:
            query += " AND domain LIKE ?"
            params.append(f"%{domain}%")

        query += " ORDER BY id DESC LIMIT ? OFFSET ?"
        params.extend([limit, offset])

        with self._connection() as conn:
            cursor = conn.cursor()
            cursor.execute(query, params)
            return [dict(row) for row in cursor.fetchall()]

    def review_detection(
        self,
        detection_id: int,
        review_status: str,
        corrected_label: Optional[str] = None,
        reviewer_notes: Optional[str] = None
    ) -> bool:
        """
        Marks a detection as 'confirmed', 'false_positive', or 'unreviewed'.
        If 'false_positive', stores the ground truth corrected_label.
        """
        with self._connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE detections
                SET review_status = ?,
                    corrected_label = ?,
                    reviewer_notes = ?
                WHERE id = ?
            """, (review_status, corrected_label, reviewer_notes, detection_id))
            conn.commit()
            return cursor.rowcount > 0

    def get_stats(self) -> Dict[str, Any]:
        """Calculates review metrics and category distributions."""
        with self._connection() as conn:
            cursor = conn.cursor()

            cursor.execute("SELECT COUNT(*) FROM detections")
            total = cursor.fetchone()[0]

            cursor.execute("SELECT COUNT(*) FROM detections WHERE review_status = 'unreviewed'")
            unreviewed = cursor.fetchone()[0]

            cursor.execute("SELECT COUNT(*) FROM detections WHERE review_status = 'confirmed'")
            confirmed = cursor.fetchone()[0]

            cursor.execute("SELECT COUNT(*) FROM detections WHERE review_status = 'false_positive'")
            false_positives = cursor.fetchone()[0]

            cursor.execute("SELECT category, COUNT(*) FROM detections GROUP BY category")
            category_counts = {row[0]: row[1] for row in cursor.fetchall()}

            cursor.execute("SELECT source_type, COUNT(*) FROM detections GROUP BY source_type")
            source_counts = {row[0]: row[1] for row in cursor.fetchall()}

            return {
                "total_detections": total,
                "unreviewed_count": unreviewed,
                "confirmed_count": confirmed,
                "false_positive_count": false_positives,
                "category_counts": category_counts,
                "source_counts": source_counts
            }

    def export_dataset_for_training(self, status_filter: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Exports detections in a format directly usable for fine-tuning RoBERTa/BERT.
        Accounts for false positive corrections:
        - If 'false_positive', uses 'corrected_label' (default: 'Not Dark Pattern').
        - If 'confirmed', confirms the dark pattern category.
        """
        query = "SELECT * FROM detections"
        params = []
        if status_filter:
            query += " WHERE review_status = ?"
            params.append(status_filter)
        query += " ORDER BY id ASC"

        with self._connection() as conn:
            cursor = conn.cursor()
            cursor.execute(query, params)
            dataset = []
            for row in cursor.fetchall():
                rev = row["review_status"]
                orig_cat = row["category"]
                corrected = row["corrected_label"]

                if rev == "false_positive":
                    final_label = corrected if corrected else "Not Dark Pattern"
                    is_dp = False if final_label == "Not Dark Pattern" else True
                elif rev == "confirmed":
                    final_label = corrected if corrected else orig_cat
                    is_dp = True
                else:
                    final_label = orig_cat
                    is_dp = True

                dataset.append({
                    "id": row["id"],
                    "candidate_text": row["candidate_text"],
                    "context": row["context"] or row["candidate_text"],
                    "label": final_label,
                    "is_dark_pattern": is_dp,
                    "original_prediction": orig_cat,
                    "review_status": rev,
                    "source_type": row["source_type"],
                    "page_url": row["page_url"]
                })
            return dataset
