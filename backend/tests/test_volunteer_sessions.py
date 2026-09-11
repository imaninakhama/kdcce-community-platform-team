from datetime import timedelta

from app.extensions import db
from app.models import VolunteerSession, utcnow


def _register(client, email="sessvol@example.com", name="Session Volunteer", password="TestPassword123!"):
    client.post("/api/auth/register", json={"name": name, "email": email, "password": password})
    return email, password


def _login(client, email, password="TestPassword123!"):
    resp = client.post("/api/auth/login", json={"email": email, "password": password})
    assert resp.status_code == 200
    return resp.get_json()


def _make_stale(app, volunteer_id, seconds_ago):
    with app.app_context():
        session_ = VolunteerSession.query.filter_by(volunteer_id=volunteer_id).order_by(VolunteerSession.login_at.desc()).first()
        session_.last_seen_at = utcnow() - timedelta(seconds=seconds_ago)
        db.session.commit()


# ---------- Login creates a session (volunteers only) ----------

def test_volunteer_login_creates_a_session(client, app):
    email, password = _register(client)
    body = _login(client, email, password)
    volunteer_id = body["user"]["id"]

    with app.app_context():
        sessions = VolunteerSession.query.filter_by(volunteer_id=volunteer_id).all()
        assert len(sessions) == 1
        assert sessions[0].logout_at is None
        assert sessions[0].last_seen_at is not None


def test_staff_login_does_not_create_a_session(client, app, make_staff_user):
    user, _ = make_staff_user("staff", email="staffsess@example.com")
    resp = client.post("/api/auth/login", json={"email": "staffsess@example.com", "password": "TestPassword123!"})
    assert resp.status_code == 200

    with app.app_context():
        assert VolunteerSession.query.filter_by(volunteer_id=user["id"]).count() == 0


def test_registration_alone_does_not_create_a_session(client, app, make_user):
    user, _, _ = make_user()
    with app.app_context():
        assert VolunteerSession.query.filter_by(volunteer_id=user["id"]).count() == 0


# ---------- Logout closes the active session ----------

def test_logout_closes_the_active_session(client, app, auth_header):
    email, password = _register(client)
    body = _login(client, email, password)
    volunteer_id = body["user"]["id"]

    resp = client.post("/api/auth/logout", headers=auth_header(body["access_token"]))
    assert resp.status_code == 204

    with app.app_context():
        session_ = VolunteerSession.query.filter_by(volunteer_id=volunteer_id).first()
        assert session_.logout_at is not None


def test_logout_is_a_no_op_when_there_is_no_open_session(client, make_staff_user, auth_header):
    _, token = make_staff_user("staff")
    resp = client.post("/api/auth/logout", headers=auth_header(token))
    assert resp.status_code == 204


# ---------- Heartbeat ----------

def test_heartbeat_updates_last_seen_at(client, app, auth_header):
    email, password = _register(client)
    body = _login(client, email, password)
    volunteer_id = body["user"]["id"]
    _make_stale(app, volunteer_id, seconds_ago=200)

    resp = client.post("/api/auth/heartbeat", headers=auth_header(body["access_token"]))
    assert resp.status_code == 204

    with app.app_context():
        session_ = VolunteerSession.query.filter_by(volunteer_id=volunteer_id).first()
        assert (utcnow().replace(tzinfo=None) - session_.last_seen_at.replace(tzinfo=None)).total_seconds() < 5


def test_heartbeat_cannot_reopen_a_session_via_a_second_login(client, app, auth_header):
    """logout revokes the access token itself (existing behavior,
    unrelated to session tracking), so a closed session can't be
    heartbeat-ed back open with the same credentials — a fresh login is
    required, and that correctly opens a brand-new session rather than
    reusing the closed one."""
    email, password = _register(client)
    first = _login(client, email, password)
    volunteer_id = first["user"]["id"]
    client.post("/api/auth/logout", headers=auth_header(first["access_token"]))

    second = _login(client, email, password)
    client.post("/api/auth/heartbeat", headers=auth_header(second["access_token"]))

    with app.app_context():
        sessions = VolunteerSession.query.filter_by(volunteer_id=volunteer_id).order_by(VolunteerSession.login_at).all()
        assert len(sessions) == 2
        assert sessions[0].logout_at is not None
        assert sessions[1].logout_at is None
        assert sessions[1].last_seen_at is not None


def test_heartbeat_is_a_no_op_for_non_volunteers(client, make_staff_user, auth_header):
    _, token = make_staff_user("admin")
    resp = client.post("/api/auth/heartbeat", headers=auth_header(token))
    assert resp.status_code == 204


# ---------- Admin: list & online endpoints ----------

def test_unauthenticated_cannot_list_volunteer_sessions(client):
    assert client.get("/api/admin/volunteer-sessions").status_code == 401
    assert client.get("/api/admin/volunteer-sessions/online").status_code == 401


def test_volunteer_cannot_list_volunteer_sessions(client, auth_header):
    email, password = _register(client)
    body = _login(client, email, password)
    resp = client.get("/api/admin/volunteer-sessions", headers=auth_header(body["access_token"]))
    assert resp.status_code == 403


def test_admin_lists_volunteer_sessions_with_expected_shape(client, app, auth_header, make_staff_user):
    _, admin_token = make_staff_user("admin")
    email, password = _register(client, email="shapevol@example.com", name="Shape Volunteer")
    body = _login(client, email, password)

    resp = client.get("/api/admin/volunteer-sessions", headers=auth_header(admin_token))
    assert resp.status_code == 200
    sessions = resp.get_json()["sessions"]
    assert len(sessions) == 1
    row = sessions[0]
    assert row["volunteer_id"] == body["user"]["id"]
    assert row["volunteer_name"] == "Shape Volunteer"
    assert row["volunteer_email"] == "shapevol@example.com"
    assert row["login_at"] is not None
    assert row["logout_at"] is None
    assert row["last_seen_at"] is not None
    assert row["status"] == "Online"
    assert isinstance(row["duration_seconds"], int)


def test_admin_lists_volunteer_sessions_ordered_most_recent_first(client, app, auth_header, make_staff_user):
    _, admin_token = make_staff_user("admin")
    first_email, first_password = _register(client, email="first@example.com", name="First Volunteer")
    _login(client, first_email, first_password)
    second_email, second_password = _register(client, email="second@example.com", name="Second Volunteer")
    _login(client, second_email, second_password)

    resp = client.get("/api/admin/volunteer-sessions", headers=auth_header(admin_token))
    sessions = resp.get_json()["sessions"]
    assert sessions[0]["volunteer_email"] == "second@example.com"
    assert sessions[1]["volunteer_email"] == "first@example.com"


def test_online_endpoint_excludes_a_session_with_a_stale_last_seen_at(client, app, auth_header, make_staff_user):
    _, admin_token = make_staff_user("admin")
    email, password = _register(client)
    body = _login(client, email, password)
    _make_stale(app, body["user"]["id"], seconds_ago=999)

    resp = client.get("/api/admin/volunteer-sessions/online", headers=auth_header(admin_token))
    assert resp.status_code == 200
    assert resp.get_json()["sessions"] == []

    full = client.get("/api/admin/volunteer-sessions", headers=auth_header(admin_token))
    row = full.get_json()["sessions"][0]
    assert row["status"] == "Offline"


def test_online_endpoint_excludes_a_logged_out_session(client, app, auth_header, make_staff_user):
    _, admin_token = make_staff_user("admin")
    email, password = _register(client)
    body = _login(client, email, password)
    client.post("/api/auth/logout", headers=auth_header(body["access_token"]))

    resp = client.get("/api/admin/volunteer-sessions/online", headers=auth_header(admin_token))
    assert resp.get_json()["sessions"] == []


def test_online_endpoint_includes_a_freshly_seen_session(client, auth_header, make_staff_user):
    _, admin_token = make_staff_user("admin")
    email, password = _register(client)
    _login(client, email, password)

    resp = client.get("/api/admin/volunteer-sessions/online", headers=auth_header(admin_token))
    sessions = resp.get_json()["sessions"]
    assert len(sessions) == 1
    assert sessions[0]["status"] == "Online"


def test_closed_session_duration_matches_logout_minus_login(client, app, auth_header):
    email, password = _register(client)
    body = _login(client, email, password)
    volunteer_id = body["user"]["id"]

    with app.app_context():
        session_ = VolunteerSession.query.filter_by(volunteer_id=volunteer_id).first()
        session_.login_at = utcnow() - timedelta(minutes=10)
        db.session.commit()

    client.post("/api/auth/logout", headers=auth_header(body["access_token"]))

    with app.app_context():
        session_ = VolunteerSession.query.filter_by(volunteer_id=volunteer_id).first()
        duration = (session_.logout_at.replace(tzinfo=None) - session_.login_at.replace(tzinfo=None)).total_seconds()
        assert 590 <= duration <= 610
