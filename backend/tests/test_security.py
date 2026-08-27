"""Tests de sécurité — authentification, autorisation, RBAC, IDOR, mass assignment."""
from __future__ import annotations

import os
import sys
import unittest
import uuid

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

os.environ.setdefault("ENVIRONMENT", "development")
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-for-security-tests-32chars")
os.environ.setdefault("USE_SQLITE", "true")

from security import (  # noqa: E402
    assert_can_modify_user,
    filter_admin_settings_update,
    validate_password_policy,
    verify_booking_payment_token,
)
from gallery_password import hash_gallery_password, verify_gallery_password  # noqa: E402
from public_settings import filter_public_settings  # noqa: E402

HAS_API_TESTS = False
try:
    from fastapi.testclient import TestClient  # noqa: E402
    from main import app  # noqa: E402
    from database import SessionLocal  # noqa: E402
    from models import User  # noqa: E402
    from security import hash_password  # noqa: E402

    HAS_API_TESTS = True
except (ModuleNotFoundError, RuntimeError):
    pass


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


class RbacHelperTests(unittest.TestCase):
    def test_photographer_cannot_modify_admin(self):
        with self.assertRaises(Exception):
            assert_can_modify_user("photographer", "admin")

    def test_admin_can_modify_photographer(self):
        assert_can_modify_user("admin", "photographer")

    def test_settings_whitelist_strips_unknown_keys(self):
        filtered = filter_admin_settings_update(
            {"studioName": "KSW", "role": "admin", "isAdmin": True, "bookings": []}
        )
        self.assertIn("studioName", filtered)
        self.assertNotIn("role", filtered)
        self.assertNotIn("isAdmin", filtered)
        self.assertNotIn("bookings", filtered)


class BookingPaymentTokenTests(unittest.TestCase):
    def test_rejects_missing_or_wrong_token(self):
        from fastapi import HTTPException

        booking = {"id": "b1", "paymentToken": "secret-token-abc"}
        with self.assertRaises(HTTPException):
            verify_booking_payment_token(booking, "wrong")
        with self.assertRaises(HTTPException):
            verify_booking_payment_token(booking, "")

    def test_accepts_valid_token(self):
        booking = {"id": "b1", "paymentToken": "secret-token-abc"}
        verify_booking_payment_token(booking, "secret-token-abc")


class ApiSecurityTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        if not HAS_API_TESTS:
            raise unittest.SkipTest("httpx/FastAPI TestClient indisponible — pip install httpx.")
        cls.client = TestClient(app)
        cls._seed_staff_users()

    @classmethod
    def _seed_staff_users(cls):
        db = SessionLocal()
        try:
            admin = db.query(User).filter(User.email == "sec-admin@test.local").first()
            if not admin:
                admin = User(
                    id="sec-admin-id",
                    first_name="Sec",
                    last_name="Admin",
                    email="sec-admin@test.local",
                    password=hash_password("AdminSecure9!"),
                    role="admin",
                    status="active",
                )
                db.add(admin)
            photog = db.query(User).filter(User.email == "sec-photo@test.local").first()
            if not photog:
                photog = User(
                    id="sec-photo-id",
                    first_name="Sec",
                    last_name="Photo",
                    email="sec-photo@test.local",
                    password=hash_password("PhotoSecure9!"),
                    role="photographer",
                    status="active",
                )
                db.add(photog)
            target_admin = db.query(User).filter(User.email == "sec-target-admin@test.local").first()
            if not target_admin:
                target_admin = User(
                    id="sec-target-admin-id",
                    first_name="Target",
                    last_name="Admin",
                    email="sec-target-admin@test.local",
                    password=hash_password("TargetAdmin9!"),
                    role="admin",
                    status="active",
                )
                db.add(target_admin)
            db.commit()
        finally:
            db.close()

    @classmethod
    def _login(cls, email: str, password: str) -> str:
        res = cls.client.post("/api/v1/auth/login", json={"email": email, "password": password})
        if res.status_code != 200:
            raise RuntimeError(f"Login failed for {email}: {res.status_code} {res.text}")
        data = res.json()
        if data.get("requires_2fa"):
            uid = data.get("user_id") or data.get("user", {}).get("id")
            verify = cls.client.post(
                "/api/v1/auth/verify-2fa",
                json={"user_id": uid, "code": "123456"},
            )
            if verify.status_code != 200:
                raise RuntimeError(f"2FA failed: {verify.text}")
            return verify.cookies.get("studio_token") or verify.json().get("token", "")
        return res.cookies.get("studio_token") or data.get("token", "")

    def test_admin_users_requires_auth(self):
        client = TestClient(app)
        res = client.get("/api/v1/admin/users")
        self.assertIn(res.status_code, (401, 403))

    def test_health_is_public(self):
        res = TestClient(app).get("/api/v1/health")
        self.assertEqual(res.status_code, 200)

    def test_public_settings_redacts_smtp(self):
        res = TestClient(app).get("/api/v1/settings")
        self.assertEqual(res.status_code, 200)
        data = res.json().get("data") or {}
        self.assertNotIn("smtpHost", data)
        self.assertNotIn("smtpPassword", data)

    def test_register_rejects_weak_password(self):
        res = self.client.post(
            "/api/v1/auth/register",
            json={
                "first_name": "Test",
                "last_name": "User",
                "email": f"sec-test-{os.getpid()}@example.com",
                "password": "12345678",
            },
        )
        self.assertEqual(res.status_code, 400)

    def test_register_forces_client_role(self):
        email = f"sec-reg-{uuid.uuid4().hex[:8]}@example.com"
        res = self.client.post(
            "/api/v1/auth/register",
            json={
                "first_name": "Test",
                "last_name": "User",
                "email": email,
                "password": "ClientSecure9!",
            },
        )
        self.assertEqual(res.status_code, 200)
        user = res.json().get("user") or {}
        self.assertEqual(user.get("role"), "client")
        self.assertEqual(user.get("status"), "pending")

    def test_photographer_cannot_reset_admin_password(self):
        token = self._login("sec-photo@test.local", "PhotoSecure9!")
        res = self.client.post(
            "/api/v1/admin/users",
            json={
                "id": "sec-target-admin-id",
                "email": "sec-target-admin@test.local",
                "password": "HackedAdmin9!",
            },
            cookies={"studio_token": token},
        )
        self.assertEqual(res.status_code, 403)

    def test_photographer_cannot_assign_admin_role(self):
        token = self._login("sec-photo@test.local", "PhotoSecure9!")
        email = f"sec-new-{uuid.uuid4().hex[:8]}@example.com"
        res = self.client.post(
            "/api/v1/admin/users",
            json={
                "email": email,
                "firstName": "Evil",
                "lastName": "Admin",
                "role": "admin",
                "password": "NewAdminSecure9!",
                "status": "active",
            },
            cookies={"studio_token": token},
        )
        self.assertEqual(res.status_code, 403)

    def test_admin_can_create_client(self):
        token = self._login("sec-admin@test.local", "AdminSecure9!")
        email = f"sec-client-{uuid.uuid4().hex[:8]}@example.com"
        res = self.client.post(
            "/api/v1/admin/users",
            json={
                "email": email,
                "firstName": "New",
                "lastName": "Client",
                "role": "client",
                "password": "ClientNewSecure9!",
                "status": "active",
            },
            cookies={"studio_token": token},
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json().get("user", {}).get("role"), "client")

    def test_stripe_checkout_rejects_without_payment_token(self):
        res = self.client.post(
            "/api/v1/bookings/stripe/create-checkout-session",
            json={
                "booking_id": "nonexistent-id",
                "payment_token": "invalid",
                "success_url": "http://localhost:3000/reservation",
                "cancel_url": "http://localhost:3000/reservation",
            },
        )
        self.assertIn(res.status_code, (403, 404))

    def test_settings_update_ignores_privilege_keys(self):
        token = self._login("sec-admin@test.local", "AdminSecure9!")
        res = self.client.post(
            "/api/v1/settings",
            json={
                "settings": {
                    "studioName": "KSW TEST",
                    "role": "admin",
                    "isAdmin": True,
                    "permissions": ["*"],
                }
            },
            cookies={"studio_token": token},
        )
        self.assertEqual(res.status_code, 200)
        data = res.json().get("data") or {}
        self.assertNotIn("role", data)
        self.assertNotIn("isAdmin", data)
        self.assertNotIn("permissions", data)


class Staff2faHelperTests(unittest.TestCase):
    def test_staff_requires_2fa_respects_global_setting(self):
        from auth import staff_requires_2fa, staff_two_factor_enabled_flag
        from unittest.mock import MagicMock, patch

        user = MagicMock()
        user.role = "admin"
        user.two_factor_enabled = None
        db = MagicMock()

        with patch("auth.is_superuser", return_value=False), patch("auth.get_setting_bool", return_value=False):
            self.assertFalse(staff_requires_2fa(user, db))
            self.assertFalse(staff_two_factor_enabled_flag(user, db))

        with patch("auth.is_superuser", return_value=False), patch("auth.get_setting_bool", return_value=True):
            self.assertTrue(staff_requires_2fa(user, db))
            self.assertTrue(staff_two_factor_enabled_flag(user, db))

    def test_staff_requires_2fa_respects_user_opt_out(self):
        from auth import staff_requires_2fa, staff_two_factor_enabled_flag
        from unittest.mock import MagicMock

        user = MagicMock()
        user.role = "photographer"
        user.two_factor_enabled = False
        db = MagicMock()

        with unittest.mock.patch("auth.get_setting_bool", return_value=True):
            self.assertFalse(staff_requires_2fa(user, db))
            self.assertFalse(staff_two_factor_enabled_flag(user, db))


if __name__ == "__main__":
    unittest.main()
