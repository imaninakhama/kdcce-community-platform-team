VALID_STAFF = {"name": "New Staffer", "email": "new-staffer@example.com", "password": "TestPassword123!", "role": "staff"}


def test_admin_can_list_admin_and_staff_accounts(client, make_staff_user, auth_header):
    _, admin_token = make_staff_user("admin")
    _, staff_token = make_staff_user("staff", email="existing-staff@example.com")

    resp = client.get("/api/admin/users", headers=auth_header(admin_token))
    assert resp.status_code == 200
    emails = [u["email"] for u in resp.get_json()["users"]]
    assert "existing-staff@example.com" in emails


def test_staff_cannot_list_users(client, make_staff_user, auth_header):
    _, staff_token = make_staff_user("staff")
    resp = client.get("/api/admin/users", headers=auth_header(staff_token))
    assert resp.status_code == 403


def test_volunteer_cannot_list_users(client, make_user, auth_header):
    _, access_token, _ = make_user()
    resp = client.get("/api/admin/users", headers=auth_header(access_token))
    assert resp.status_code == 403


def test_unauthenticated_cannot_list_users(client):
    resp = client.get("/api/admin/users")
    assert resp.status_code == 401


def test_volunteers_do_not_appear_in_admin_user_list(client, make_user, make_staff_user, auth_header):
    make_user(email="a-volunteer@example.com")
    _, admin_token = make_staff_user("admin")

    resp = client.get("/api/admin/users", headers=auth_header(admin_token))
    emails = [u["email"] for u in resp.get_json()["users"]]
    assert "a-volunteer@example.com" not in emails


def test_admin_can_create_a_staff_account(client, make_staff_user, auth_header):
    _, admin_token = make_staff_user("admin")
    resp = client.post("/api/admin/users", json=VALID_STAFF, headers=auth_header(admin_token))
    assert resp.status_code == 201
    body = resp.get_json()["user"]
    assert body["email"] == "new-staffer@example.com"
    assert body["role"] == "staff"
    assert "password" not in body and "password_hash" not in body

    login = client.post("/api/auth/login", json={"email": "new-staffer@example.com", "password": "TestPassword123!"})
    assert login.status_code == 200
    assert login.get_json()["user"]["role"] == "staff"


def test_admin_can_create_another_admin_account(client, make_staff_user, auth_header):
    _, admin_token = make_staff_user("admin")
    resp = client.post("/api/admin/users", json={**VALID_STAFF, "email": "second-admin@example.com", "role": "admin"}, headers=auth_header(admin_token))
    assert resp.status_code == 201
    assert resp.get_json()["user"]["role"] == "admin"


def test_staff_cannot_create_a_user(client, make_staff_user, auth_header):
    _, staff_token = make_staff_user("staff")
    resp = client.post("/api/admin/users", json=VALID_STAFF, headers=auth_header(staff_token))
    assert resp.status_code == 403


def test_volunteer_cannot_create_a_user(client, make_user, auth_header):
    _, access_token, _ = make_user()
    resp = client.post("/api/admin/users", json=VALID_STAFF, headers=auth_header(access_token))
    assert resp.status_code == 403


def test_create_rejects_duplicate_email(client, make_staff_user, auth_header):
    _, admin_token = make_staff_user("admin")
    client.post("/api/admin/users", json=VALID_STAFF, headers=auth_header(admin_token))
    resp = client.post("/api/admin/users", json=VALID_STAFF, headers=auth_header(admin_token))
    assert resp.status_code == 409


def test_create_rejects_volunteer_role(client, make_staff_user, auth_header):
    _, admin_token = make_staff_user("admin")
    resp = client.post("/api/admin/users", json={**VALID_STAFF, "role": "volunteer"}, headers=auth_header(admin_token))
    assert resp.status_code == 400
    assert "role" in resp.get_json()["details"]


def test_create_rejects_short_password(client, make_staff_user, auth_header):
    _, admin_token = make_staff_user("admin")
    resp = client.post("/api/admin/users", json={**VALID_STAFF, "password": "short"}, headers=auth_header(admin_token))
    assert resp.status_code == 400


def test_admin_can_delete_a_staff_account(client, make_staff_user, auth_header):
    _, admin_token = make_staff_user("admin")
    staff_user, _ = make_staff_user("staff", email="removable@example.com")
    resp = client.delete(f"/api/admin/users/{staff_user['id']}", headers=auth_header(admin_token))
    assert resp.status_code == 204

    listed = client.get("/api/admin/users", headers=auth_header(admin_token))
    assert staff_user["id"] not in [u["id"] for u in listed.get_json()["users"]]


def test_staff_cannot_delete_a_user(client, make_staff_user, auth_header):
    _, staff_token = make_staff_user("staff")
    other_staff, _ = make_staff_user("staff", email="other-staff@example.com")
    resp = client.delete(f"/api/admin/users/{other_staff['id']}", headers=auth_header(staff_token))
    assert resp.status_code == 403


def test_admin_cannot_delete_own_account(client, make_staff_user, auth_header):
    admin_user, admin_token = make_staff_user("admin")
    resp = client.delete(f"/api/admin/users/{admin_user['id']}", headers=auth_header(admin_token))
    assert resp.status_code == 409


def test_admin_can_delete_a_different_admin_account(client, make_staff_user, auth_header):
    _, admin_token = make_staff_user("admin")
    other_admin, _ = make_staff_user("admin", email="second-admin-del@example.com")
    resp = client.delete(f"/api/admin/users/{other_admin['id']}", headers=auth_header(admin_token))
    assert resp.status_code == 204


def test_delete_rejects_a_volunteer_id(client, make_user, make_staff_user, auth_header):
    volunteer_user, _, _ = make_user(email="not-manageable-here@example.com")
    _, admin_token = make_staff_user("admin")
    resp = client.delete(f"/api/admin/users/{volunteer_user['id']}", headers=auth_header(admin_token))
    assert resp.status_code == 404


def test_delete_rejects_unknown_id(client, make_staff_user, auth_header):
    _, admin_token = make_staff_user("admin")
    resp = client.delete("/api/admin/users/999999", headers=auth_header(admin_token))
    assert resp.status_code == 404
