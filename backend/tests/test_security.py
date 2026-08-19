"""Tests de sécurité — authentification, autorisation, politique mots de passe."""
from __future__ import annotations

import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

os.environ.setdefault("ENVIRONMENT", "development")
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-for-security-tests-32chars")
os.environ.setdefault("USE_SQLITE", "true")

try:
    from fastapi.testclient import TestClient  # noqa: E402

    from main import app  # noqa: E402

    HAS_FASTAPI = True
except ModuleNotFoundError:
    HAS_FASTAPI = False
from security import validate_password_policy  # noqa: E402
from gallery_password import hash_gallery_password, verify_gallery_password  # noqa: E402
from public_settings import filter_public_settings  # noqa: E402


class PasswordPolicyTests(unittest.TestCase):
    def test_rejects_short_password(self):
        with self.assertRaises(Exception):
            validate_password_policy("abc")

    def test_rejects_weak_password(self):
        with self.assertRaises(Exception):
            validate_password_policy("password123")

    def test_accepts_reasonable_password(self):
        validate_password_policy("StudioSecure9!")


class GalleryPasswordTests(unittest.TestCase):
    def test_hash_and_verify(self):
        hashed = hash_gallery_password("TestPass99")
        self.assertTrue(verify_gallery_password(hashed, "TestPass99"))
        self.assertFalse(verify_gallery_password(hashed, "wrong"))


class PublicSettingsTests(unittest.TestCase):
    def test_filters_sensitive_keys(self):
        data = {
            "studioName": "KSW",
            "smtpHost": "smtp.example.com",
            "stripeSecretKey": "sk_live_x",
        }
        public = filter_public_settings(data)
        self.assertIn("studioName", public)
        self.assertNotIn("smtpHost", public)
        self.assertNotIn("stripeSecretKey", public)


class ApiSecurityTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        if not HAS_FASTAPI:
            raise unittest.SkipTest("FastAPI non installé — lancer les tests dans le conteneur backend.")
        cls.client = TestClient(app)

    def test_admin_users_requires_auth(self):
        res = cls.client.get("/api/v1/admin/users")
        self.assertIn(res.status_code, (401, 403))

    def test_health_is_public(self):
        res = cls.client.get("/api/v1/health")
        self.assertEqual(res.status_code, 200)

    def test_public_settings_redacts_smtp(self):
        res = cls.client.get("/api/v1/settings")
        self.assertEqual(res.status_code, 200)
        data = res.json().get("data") or {}
        self.assertNotIn("smtpHost", data)
        self.assertNotIn("smtpPassword", data)

    def test_register_rejects_weak_password(self):
        res = cls.client.post(
            "/api/v1/auth/register",
            json={
                "first_name": "Test",
                "last_name": "User",
                "email": f"sec-test-{os.getpid()}@example.com",
                "password": "12345678",
            },
        )
        self.assertEqual(res.status_code, 400)


if __name__ == "__main__":
    unittest.main()
