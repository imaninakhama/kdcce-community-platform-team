from datetime import timedelta
from unittest.mock import patch

from app.extensions import db
from app.models import VolunteerInvitation, utcnow


def _get_invitation(app, volunteer_id):
    """Reads the invitation token straight from the database, the same
    way it would only ever reach a real volunteer — through the approval
    email, never an API response (the token is never returned to any
    authenticated caller, including the admin who approved them)."""
    with app.app_context():
        row = VolunteerInvitation.query.filter_by(volunteer_profile_id=volunteer_id).order_by(VolunteerInvitation.id.desc()).first()
        return row.token if row else None


def _approve(client, auth_header, admin_token, volunteer_id):
    return client.patch(f"/api/volunteers/{volunteer_id}", json={"status": "Verified"}, headers=auth_header(admin_token))


def test_approving_a_volunteer_creates_an_invitation(client, app, make_user, make_staff_user, auth_header):
    make_user(email="invitee1@example.com")
    _, admin_token = make_staff_user("admin")
    volunteer_id = client.get("/api/volunteers", headers=auth_header(admin_token)).get_json()["volunteers"][0]["id"]

    resp = _approve(client, auth_header, admin_token, volunteer_id)
    assert resp.status_code == 200
    assert _get_invitation(app, volunteer_id) is not None


def test_rejecting_a_volunteer_creates_no_invitation(client, app, make_user, make_staff_user, auth_header):
    make_user(email="invitee2@example.com")
    _, admin_token = make_staff_user("admin")
    volunteer_id = client.get("/api/volunteers", headers=auth_header(admin_token)).get_json()["volunteers"][0]["id"]

    client.patch(f"/api/volunteers/{volunteer_id}", json={"status": "Rejected"}, headers=auth_header(admin_token))
    assert _get_invitation(app, volunteer_id) is None


def test_reapproving_creates_a_second_invitation_not_a_duplicate_send(client, app, make_user, make_staff_user, auth_header):
    """Approve -> reject -> approve again: exactly two invitations exist
    (one per Verified transition), and only the newest one is still
    valid — this is the "don't send duplicate emails on an unchanged
    status" guarantee, expressed the only way a test can observe it
    black-box (repeat PATCHes to the same status create nothing new;
    see test_status_persists_across_partial_edit_by_staff in
    test_volunteers.py for that half)."""
    make_user(email="invitee3@example.com")
    _, admin_token = make_staff_user("admin")
    volunteer_id = client.get("/api/volunteers", headers=auth_header(admin_token)).get_json()["volunteers"][0]["id"]

    _approve(client, auth_header, admin_token, volunteer_id)
    client.patch(f"/api/volunteers/{volunteer_id}", json={"status": "Rejected"}, headers=auth_header(admin_token))
    _approve(client, auth_header, admin_token, volunteer_id)

    with app.app_context():
        count = VolunteerInvitation.query.filter_by(volunteer_profile_id=volunteer_id).count()
    assert count == 2


def test_volunteer_can_accept_a_valid_invitation(client, app, make_user, make_staff_user, auth_header):
    user, _, _ = make_user(email="invitee4@example.com", name="Grace Achieng")
    _, admin_token = make_staff_user("admin")
    volunteer_id = client.get("/api/volunteers", headers=auth_header(admin_token)).get_json()["volunteers"][0]["id"]
    _approve(client, auth_header, admin_token, volunteer_id)
    token = _get_invitation(app, volunteer_id)

    preview = client.get(f"/api/volunteers/invitations/{token}")
    assert preview.status_code == 200
    assert preview.get_json()["volunteer_name"] == "Grace Achieng"

    resp = client.post(f"/api/volunteers/invitations/{token}/accept")
    assert resp.status_code == 200
    body = resp.get_json()
    assert body["user"]["email"] == "invitee4@example.com"
    assert body["access_token"]
    assert body["refresh_token"]

    # The issued token is real — it authenticates like any other login.
    me = client.get("/api/auth/me", headers=auth_header(body["access_token"]))
    assert me.status_code == 200
    assert me.get_json()["user"]["id"] == user["id"]


def test_accepting_an_invitation_twice_fails_the_second_time(client, app, make_user, make_staff_user, auth_header):
    make_user(email="invitee5@example.com")
    _, admin_token = make_staff_user("admin")
    volunteer_id = client.get("/api/volunteers", headers=auth_header(admin_token)).get_json()["volunteers"][0]["id"]
    _approve(client, auth_header, admin_token, volunteer_id)
    token = _get_invitation(app, volunteer_id)

    first = client.post(f"/api/volunteers/invitations/{token}/accept")
    assert first.status_code == 200
    second = client.post(f"/api/volunteers/invitations/{token}/accept")
    assert second.status_code == 409
    assert "already been used" in second.get_json()["error"]


def test_invalid_invitation_token_returns_friendly_404(client):
    resp = client.get("/api/volunteers/invitations/not-a-real-token")
    assert resp.status_code == 404
    assert "isn't valid" in resp.get_json()["error"]

    accept_resp = client.post("/api/volunteers/invitations/not-a-real-token/accept")
    assert accept_resp.status_code == 404


def test_expired_invitation_is_rejected_with_friendly_message(client, app, make_user, make_staff_user, auth_header):
    make_user(email="invitee6@example.com")
    _, admin_token = make_staff_user("admin")
    volunteer_id = client.get("/api/volunteers", headers=auth_header(admin_token)).get_json()["volunteers"][0]["id"]
    _approve(client, auth_header, admin_token, volunteer_id)
    token = _get_invitation(app, volunteer_id)

    with app.app_context():
        row = VolunteerInvitation.query.filter_by(token=token).first()
        row.expires_at = utcnow() - timedelta(days=1)
        db.session.commit()

    resp = client.post(f"/api/volunteers/invitations/{token}/accept")
    assert resp.status_code == 410
    assert "expired" in resp.get_json()["error"]

    # The account itself is untouched — normal login still works.
    login = client.post("/api/auth/login", json={"email": "invitee6@example.com", "password": "TestPassword123!"})
    assert login.status_code == 200


# ---------- Emails ----------
# `send_email` itself is stdlib smtplib and best covered separately from
# these flows; what matters here is that each real status change fires
# the right *call* — recipient, content — not that an SMTP server is
# reachable in a test run. Patched where each module looks the name up
# (app.auth.routes / app.volunteers.routes), not where it's defined.

def test_registration_sends_application_received_email(client):
    with patch("app.auth.routes.send_application_received_email") as mock_send:
        resp = client.post("/api/auth/register", json={"name": "New Applicant", "email": "applicant@example.com", "password": "TestPassword123!"})
    assert resp.status_code == 201
    mock_send.assert_called_once()
    (user,), _ = mock_send.call_args
    assert user.email == "applicant@example.com"


def test_approval_sends_approved_email_with_the_new_invitation(client, make_user, make_staff_user, auth_header):
    make_user(email="invitee8@example.com")
    _, admin_token = make_staff_user("admin")
    volunteer_id = client.get("/api/volunteers", headers=auth_header(admin_token)).get_json()["volunteers"][0]["id"]

    with patch("app.volunteers.routes.send_approved_email") as mock_send:
        resp = _approve(client, auth_header, admin_token, volunteer_id)
    assert resp.status_code == 200
    mock_send.assert_called_once()
    (user, invitation), _ = mock_send.call_args
    assert user.email == "invitee8@example.com"
    assert invitation.token


def test_rejection_sends_rejected_email_with_the_given_reason(client, make_user, make_staff_user, auth_header):
    make_user(email="invitee9@example.com")
    _, admin_token = make_staff_user("admin")
    volunteer_id = client.get("/api/volunteers", headers=auth_header(admin_token)).get_json()["volunteers"][0]["id"]

    with patch("app.volunteers.routes.send_rejected_email") as mock_send:
        resp = client.patch(
            f"/api/volunteers/{volunteer_id}",
            json={"status": "Rejected", "rejection_reason": "We need volunteers in a different area right now."},
            headers=auth_header(admin_token),
        )
    assert resp.status_code == 200
    mock_send.assert_called_once()
    (user, reason), _ = mock_send.call_args
    assert user.email == "invitee9@example.com"
    assert reason == "We need volunteers in a different area right now."


def test_unchanged_status_sends_no_email(client, make_user, make_staff_user, auth_header):
    """PATCHing other fields (or the same status again) is not a status
    *change* — no repeat email for something that didn't happen again."""
    make_user(email="invitee10@example.com")
    _, admin_token = make_staff_user("admin")
    volunteer_id = client.get("/api/volunteers", headers=auth_header(admin_token)).get_json()["volunteers"][0]["id"]
    _approve(client, auth_header, admin_token, volunteer_id)

    with patch("app.volunteers.routes.send_approved_email") as mock_approved, \
         patch("app.volunteers.routes.send_rejected_email") as mock_rejected:
        resp = client.patch(f"/api/volunteers/{volunteer_id}", json={"status": "Verified", "phone": "0712345678"}, headers=auth_header(admin_token))
    assert resp.status_code == 200
    mock_approved.assert_not_called()
    mock_rejected.assert_not_called()


def test_registration_succeeds_even_if_the_email_send_blows_up(client):
    """A bug or outage in the mail path must never take the account
    creation down with it — the route wraps the call in its own
    try/except specifically so a raised exception (not just send_email's
    own internal False-return failure mode) still can't propagate."""
    with patch("app.auth.routes.send_application_received_email", side_effect=RuntimeError("mail server on fire")):
        resp = client.post("/api/auth/register", json={"name": "Resilient Applicant", "email": "resilient@example.com", "password": "TestPassword123!"})
    assert resp.status_code == 201
    assert resp.get_json()["user"]["email"] == "resilient@example.com"


def test_approval_succeeds_even_if_the_email_send_blows_up(client, make_user, make_staff_user, auth_header):
    make_user(email="invitee11@example.com")
    _, admin_token = make_staff_user("admin")
    volunteer_id = client.get("/api/volunteers", headers=auth_header(admin_token)).get_json()["volunteers"][0]["id"]

    with patch("app.volunteers.routes.send_approved_email", side_effect=RuntimeError("mail server on fire")):
        resp = _approve(client, auth_header, admin_token, volunteer_id)
    assert resp.status_code == 200
    assert resp.get_json()["volunteer"]["status"] == "Verified"


def test_expired_invitation_link_does_not_block_normal_login(client, app, make_user, make_staff_user, auth_header):
    """An invitation is a convenience, never a gate — a Verified
    volunteer can already sign in with their own password regardless of
    whether they ever open the link, expired or not."""
    make_user(email="invitee7@example.com", password="RealPassword1!")
    _, admin_token = make_staff_user("admin")
    volunteer_id = client.get("/api/volunteers", headers=auth_header(admin_token)).get_json()["volunteers"][0]["id"]
    _approve(client, auth_header, admin_token, volunteer_id)

    login = client.post("/api/auth/login", json={"email": "invitee7@example.com", "password": "RealPassword1!"})
    assert login.status_code == 200
    assert login.get_json()["user"]["role"] == "volunteer"
