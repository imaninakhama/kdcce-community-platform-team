import itertools
import tempfile

import pytest
from flask_jwt_extended import create_access_token

from app import create_app
from app.extensions import db, limiter
from app.models import User

_email_counter = itertools.count(1)


@pytest.fixture
def app():
    with tempfile.TemporaryDirectory() as instance_dir:
        flask_app = create_app("testing", instance_path=instance_dir)
        with flask_app.app_context():
            db.create_all()
            # The rate limiter's storage is a process-wide singleton (shared
            # across every test's Flask app) — reset it per test so one
            # test's calls never count against another's limit.
            limiter.reset()
            yield flask_app
            db.session.remove()
            db.drop_all()
            db.engine.dispose()


@pytest.fixture
def client(app):
    return app.test_client()


@pytest.fixture
def make_user(client):
    def _make_user(email=None, name=None, password=None):
        email = email or f"volunteer{next(_email_counter)}@example.com"
        name = name or "Test Volunteer"
        password = password or "TestPassword123!"
        resp = client.post("/api/auth/register", json={"name": name, "email": email, "password": password})
        body = resp.get_json()
        return body["user"], body["access_token"], body["refresh_token"]

    return _make_user


@pytest.fixture
def make_staff_user(app):
    def _make_staff_user(role, email=None, name="Staffer"):
        email = email or f"{role}{next(_email_counter)}@example.com"
        with app.app_context():
            user = User(name=name, email=email, role=role)
            user.set_password("TestPassword123!")
            db.session.add(user)
            db.session.commit()
            user_dict = user.to_dict()
            token = create_access_token(identity=str(user.id), additional_claims={"role": user.role})
        return user_dict, token

    return _make_staff_user


@pytest.fixture
def auth_header():
    def _auth_header(token):
        return {"Authorization": f"Bearer {token}"}

    return _auth_header
