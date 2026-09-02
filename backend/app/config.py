import os
from datetime import timedelta


class Config:
    SECRET_KEY = os.environ.get("SECRET_KEY", "change-me")
    JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "change-me-too")
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=1)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)

    SQLALCHEMY_TRACK_MODIFICATIONS = False
    # Leave DATABASE_URL unset to use the default local sqlite file at
    # backend/instance/kdcce.db — an absolute path (via Flask's
    # instance_path), resolved regardless of the process's working directory.
    SQLALCHEMY_DATABASE_URI = os.environ.get("DATABASE_URL")

    CORS_ORIGINS = [o.strip() for o in os.environ.get("CORS_ORIGINS", "http://localhost:5173").split(",") if o.strip()]

    # The frontend's own origin — used to build links this backend sends
    # in emails (e.g. the volunteer-invitation link). Deliberately
    # separate from CORS_ORIGINS (which can list several) since a link
    # needs exactly one canonical destination.
    FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:5173")

    # Outgoing email — see backend/.env.example. RESEND_API_KEY (preferred
    # — https://resend.com) is tried first; SMTP_HOST is a fallback for
    # any other provider. Leaving both unset is a safe, supported default
    # for local dev: app/email/service.py logs the email instead of
    # sending it rather than failing, so registration/approval never
    # breaks over a missing mail provider.
    RESEND_API_KEY = os.environ.get("RESEND_API_KEY")
    SMTP_HOST = os.environ.get("SMTP_HOST")
    SMTP_PORT = int(os.environ.get("SMTP_PORT", "587"))
    SMTP_USERNAME = os.environ.get("SMTP_USERNAME")
    SMTP_PASSWORD = os.environ.get("SMTP_PASSWORD")
    SMTP_USE_TLS = os.environ.get("SMTP_USE_TLS", "true").lower() != "false"
    MAIL_FROM_NAME = os.environ.get("MAIL_FROM_NAME", "KDCCE")
    MAIL_FROM_ADDRESS = os.environ.get("MAIL_FROM_ADDRESS", "no-reply@kdcce.org")

    # Hard backstop enforced before the request body is even parsed; the
    # real per-upload limit (5MB) is enforced at the application level in
    # app/assignments/service.py.
    MAX_CONTENT_LENGTH = 8 * 1024 * 1024

    # Daraja (M-Pesa) sandbox — see backend/.env.example for how to get
    # these. MPESA_SHORTCODE/MPESA_PASSKEY default to Safaricom's published
    # shared sandbox test values, so only the account-specific Consumer
    # Key/Secret and a public callback URL are required to actually enable
    # payments (app/mpesa/service.py logs a clear error instead of a
    # confusing failure if either is left unset).
    MPESA_ENV = os.environ.get("MPESA_ENV", "sandbox")
    MPESA_CONSUMER_KEY = os.environ.get("MPESA_CONSUMER_KEY")
    MPESA_CONSUMER_SECRET = os.environ.get("MPESA_CONSUMER_SECRET")
    MPESA_SHORTCODE = os.environ.get("MPESA_SHORTCODE", "174379")
    MPESA_PASSKEY = os.environ.get("MPESA_PASSKEY", "bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919")
    # Must be a publicly reachable URL — Safaricom's servers call this
    # directly, so localhost never works. Point it at an ngrok (or similar)
    # tunnel in dev: e.g. https://<your-id>.ngrok-free.app/api/mpesa/callback
    MPESA_CALLBACK_URL = os.environ.get("MPESA_CALLBACK_URL")


class TestingConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
