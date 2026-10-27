import os
import sys
import sqlite3

# Ensure backend can be imported
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend"))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from services.db_service import DatabaseService

def print_database(limit=25):
    show_all = "--all" in sys.argv
    db_service = DatabaseService()
    
    with db_service._connection() as conn:
        cur = conn.cursor()
        cur.execute("SELECT count(*) FROM detections")
        total = cur.fetchone()[0]

        print("=" * 90)
        print(f"  DARK-GUARD DATABASE DETECTIONS  |  Total Records: {total}")
        print("=" * 90)

        if total == 0:
            print("Database is clean and empty. (0 detections logged yet)")
        else:
            query = """
                SELECT id, source_type, category, confidence, review_status, candidate_text
                FROM detections
                ORDER BY id DESC
            """
            if not show_all:
                query += f" LIMIT {limit}"

            cur.execute(query)
            rows = cur.fetchall()

            print(f"{'ID':<6} | {'SOURCE':<9} | {'CATEGORY':<16} | {'CONF':<6} | {'STATUS':<12} | {'CANDIDATE TEXT'}")
            print("-" * 90)
            for r in rows:
                text_snippet = (r["candidate_text"] or "").replace("\n", " ").strip()
                if len(text_snippet) > 35:
                    text_snippet = text_snippet[:32] + "..."
                print(f"{r['id']:<6} | {r['source_type']:<9} | {r['category']:<16} | {r['confidence']*100:<5.1f}% | {r['review_status']:<12} | {text_snippet}")

        print("=" * 90)
        if not show_all and total > limit:
            print(f"Showing the latest {limit} of {total} records. (To print all records, run with: --all)")

if __name__ == "__main__":
    print_database()
