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

    # Hard backstop enforced before the request body is even parsed; the
    # real per-upload limit (5MB) is enforced at the application level in
    # app/assignments/service.py.
    MAX_CONTENT_LENGTH = 8 * 1024 * 1024


class TestingConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
