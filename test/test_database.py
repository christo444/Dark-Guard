import os
import sys
import unittest
import uuid

# Add backend directory to sys.path
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend"))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from services.db_service import DatabaseService

class TestDarkGuardDatabase(unittest.TestCase):
    def setUp(self):
        self.test_db_path = os.path.join(backend_dir, f"test_dg_{uuid.uuid4().hex[:8]}.db")
        self.db = DatabaseService(db_path=self.test_db_path)

    def tearDown(self):
        if hasattr(self, "test_db_path") and os.path.exists(self.test_db_path):
            try:
                os.remove(self.test_db_path)
            except Exception:
                pass

    def test_init_db(self):
        self.assertTrue(os.path.exists(self.test_db_path))
        with self.db._connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='detections'")
            table = cursor.fetchone()
            self.assertIsNotNone(table)

    def test_log_and_get_detection(self):
        rec_id = self.db.log_detection(
            candidate_text="Only 2 items left in stock!",
            category="Scarcity",
            confidence=0.998,
            source_type="text",
            context="Trending items. Only 2 items left in stock!",
            page_url="http://localhost:5173",
            domain="localhost"
        )
        self.assertGreater(rec_id, 0)

        records = self.db.get_detections()
        self.assertEqual(len(records), 1)
        self.assertEqual(records[0]["candidate_text"], "Only 2 items left in stock!")
        self.assertEqual(records[0]["category"], "Scarcity")
        self.assertEqual(records[0]["review_status"], "unreviewed")

    def test_batch_logging(self):
        items = [
            {"candidate_text": "Flash Sale ends in 04:59", "category": "Urgency", "confidence": 0.96, "source_type": "text"},
            {"candidate_text": "24 people are viewing this", "category": "Social Proof", "confidence": 0.94, "source_type": "text"},
            {"candidate_text": "Free shipping on orders over $50", "category": "Not Dark Pattern", "confidence": 0.99, "source_type": "text"}
        ]
        count = self.db.log_detections_batch(
            page_url="http://localhost:5173",
            domain="localhost",
            detections=items
        )
        self.assertEqual(count, 2)  # "Not Dark Pattern" should be filtered out

        records = self.db.get_detections()
        self.assertEqual(len(records), 2)

    def test_review_and_false_positive_marking(self):
        rec_id = self.db.log_detection(
            candidate_text="No Cost EMI available on select cards",
            category="Sneaking",
            confidence=0.88,
            source_type="text",
            context="Payment options: No Cost EMI available on select cards",
            page_url="http://localhost:5173"
        )

        # Mark as False Positive
        success = self.db.review_detection(
            detection_id=rec_id,
            review_status="false_positive",
            corrected_label="Not Dark Pattern",
            reviewer_notes="Legitimate payment method description, not a dark pattern."
        )
        self.assertTrue(success)

        # Verify updated record
        updated = self.db.get_detections(review_status="false_positive")
        self.assertEqual(len(updated), 1)
        self.assertEqual(updated[0]["review_status"], "false_positive")
        self.assertEqual(updated[0]["corrected_label"], "Not Dark Pattern")
        self.assertEqual(updated[0]["reviewer_notes"], "Legitimate payment method description, not a dark pattern.")

    def test_stats_and_dataset_export(self):
        # Insert 1 confirmed, 1 false positive, 1 unreviewed
        id1 = self.db.log_detection("Hurry! Deal ends soon", "Urgency", 0.97)
        id2 = self.db.log_detection("10 items remaining", "Scarcity", 0.95)
        id3 = self.db.log_detection("Standard shipping $5", "Sneaking", 0.70)

        self.db.review_detection(id1, "confirmed")
        self.db.review_detection(id3, "false_positive", corrected_label="Not Dark Pattern")

        stats = self.db.get_stats()
        self.assertEqual(stats["total_detections"], 3)
        self.assertEqual(stats["confirmed_count"], 1)
        self.assertEqual(stats["false_positive_count"], 1)
        self.assertEqual(stats["unreviewed_count"], 1)

        # Test dataset export for retraining
        dataset = self.db.export_dataset_for_training()
        self.assertEqual(len(dataset), 3)

        fp_item = [d for d in dataset if d["id"] == id3][0]
        self.assertEqual(fp_item["label"], "Not Dark Pattern")
        self.assertFalse(fp_item["is_dark_pattern"])

        conf_item = [d for d in dataset if d["id"] == id1][0]
        self.assertEqual(conf_item["label"], "Urgency")
        self.assertTrue(conf_item["is_dark_pattern"])

if __name__ == "__main__":
    unittest.main()
