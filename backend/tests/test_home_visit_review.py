def _register_member(client, token, auth_header, name="Mary Achieng"):
    resp = client.post("/api/elderly", json={"full_name": name, "gender": "Female"}, headers=auth_header(token))
    return resp.get_json()["member"]


def _verified_volunteer(client, make_user, auth_header, admin_token, email="reviewvol@example.com"):
    user, access_token, _ = make_user(email=email, name="Review Volunteer")
    volunteers = client.get("/api/volunteers", headers=auth_header(admin_token)).get_json()["volunteers"]
    vid = next(v for v in volunteers if v["email"] == email)["id"]
    client.patch(f"/api/volunteers/{vid}", json={"status": "Verified"}, headers=auth_header(admin_token))
    return user, access_token


VALID_REASON = {"reason": "Unable to attend the centre due to mobility issues"}


def _assigned_and_started_visit(client, make_user, make_staff_user, auth_header):
    _, admin_token = make_staff_user("admin")
    member = _register_member(client, admin_token, auth_header)
    vol_user, vol_token = _verified_volunteer(client, make_user, auth_header, admin_token)
    visit = client.post(
        "/api/home-visits",
        json={"elderly_member_id": member["id"], "assigned_to_id": vol_user["id"], **VALID_REASON},
        headers=auth_header(admin_token),
    ).get_json()["visit"]
    client.post(f"/api/home-visits/{visit['id']}/accept", headers=auth_header(vol_token))
    client.patch(f"/api/home-visits/{visit['id']}", json={"status": "In Progress"}, headers=auth_header(vol_token))
    return admin_token, vol_user, vol_token, visit["id"]


# ---------- Submit for review ----------

def test_volunteer_can_submit_in_progress_visit_for_review(client, make_user, make_staff_user, auth_header):
    admin_token, _, vol_token, visit_id = _assigned_and_started_visit(client, make_user, make_staff_user, auth_header)

    resp = client.post(f"/api/home-visits/{visit_id}/submit", headers=auth_header(vol_token))
    assert resp.status_code == 200
    body = resp.get_json()["visit"]
    assert body["status"] == "Under Review"
    assert body["submitted_at"] is not None

    notifications = client.get("/api/notifications", headers=auth_header(admin_token)).get_json()["notifications"]
    assert any(n["notification_type"] == "Home Visit Submitted" for n in notifications)


def test_cannot_submit_a_visit_that_is_not_in_progress(client, make_user, make_staff_user, auth_header):
    _, admin_token = make_staff_user("admin")
    member = _register_member(client, admin_token, auth_header)
    vol_user, vol_token = _verified_volunteer(client, make_user, auth_header, admin_token)
    visit = client.post("/api/home-visits", json={"elderly_member_id": member["id"], "assigned_to_id": vol_user["id"], **VALID_REASON}, headers=auth_header(admin_token)).get_json()["visit"]

    resp = client.post(f"/api/home-visits/{visit['id']}/submit", headers=auth_header(vol_token))
    assert resp.status_code == 409  # still just "Assigned", never started


def test_visit_is_locked_from_volunteer_edits_while_under_review(client, make_user, make_staff_user, auth_header):
    _, _, vol_token, visit_id = _assigned_and_started_visit(client, make_user, make_staff_user, auth_header)
    client.post(f"/api/home-visits/{visit_id}/submit", headers=auth_header(vol_token))

    resp = client.patch(f"/api/home-visits/{visit_id}", json={"observations": "sneaky edit"}, headers=auth_header(vol_token))
    assert resp.status_code == 409

    checklist_resp = client.patch(f"/api/home-visits/{visit_id}/checklist", json={"item_key": "wellbeing", "checked": True}, headers=auth_header(vol_token))
    assert checklist_resp.status_code == 409


def test_admin_can_still_edit_a_visit_under_review(client, make_user, make_staff_user, auth_header):
    admin_token, _, vol_token, visit_id = _assigned_and_started_visit(client, make_user, make_staff_user, auth_header)
    client.post(f"/api/home-visits/{visit_id}/submit", headers=auth_header(vol_token))

    resp = client.patch(f"/api/home-visits/{visit_id}", json={"observations": "admin correction"}, headers=auth_header(admin_token))
    assert resp.status_code == 200


# ---------- Approve ----------

def test_admin_can_approve_a_submitted_visit(client, make_user, make_staff_user, auth_header):
    admin_token, vol_user, vol_token, visit_id = _assigned_and_started_visit(client, make_user, make_staff_user, auth_header)
    client.post(f"/api/home-visits/{visit_id}/submit", headers=auth_header(vol_token))

    resp = client.post(f"/api/home-visits/{visit_id}/approve", headers=auth_header(admin_token))
    assert resp.status_code == 200
    body = resp.get_json()["visit"]
    assert body["status"] == "Completed"
    assert body["completed_at"] is not None
    assert body["reviewed_at"] is not None
    assert body["reviewed_by"] is not None

    notifications = client.get("/api/notifications", headers=auth_header(vol_token)).get_json()["notifications"]
    assert any(n["notification_type"] == "Home Visit Approved" for n in notifications)

    submissions = client.get(f"/api/home-visits/{visit_id}/submissions", headers=auth_header(admin_token)).get_json()["submissions"]
    assert submissions[0]["decision"] == "Approved"


def test_volunteer_cannot_approve_a_visit(client, make_user, make_staff_user, auth_header):
    _, _, vol_token, visit_id = _assigned_and_started_visit(client, make_user, make_staff_user, auth_header)
    client.post(f"/api/home-visits/{visit_id}/submit", headers=auth_header(vol_token))

    resp = client.post(f"/api/home-visits/{visit_id}/approve", headers=auth_header(vol_token))
    assert resp.status_code == 403


def test_cannot_approve_a_visit_that_is_not_under_review(client, make_user, make_staff_user, auth_header):
    admin_token, _, _, visit_id = _assigned_and_started_visit(client, make_user, make_staff_user, auth_header)
    resp = client.post(f"/api/home-visits/{visit_id}/approve", headers=auth_header(admin_token))
    assert resp.status_code == 409


# ---------- Return for changes ----------

def test_admin_return_for_changes_requires_a_reason(client, make_user, make_staff_user, auth_header):
    admin_token, _, vol_token, visit_id = _assigned_and_started_visit(client, make_user, make_staff_user, auth_header)
    client.post(f"/api/home-visits/{visit_id}/submit", headers=auth_header(vol_token))

    resp = client.post(f"/api/home-visits/{visit_id}/return", json={}, headers=auth_header(admin_token))
    assert resp.status_code == 400


def test_admin_can_return_for_changes_and_volunteer_can_then_edit_and_resubmit(client, make_user, make_staff_user, auth_header):
    admin_token, _, vol_token, visit_id = _assigned_and_started_visit(client, make_user, make_staff_user, auth_header)
    client.post(f"/api/home-visits/{visit_id}/submit", headers=auth_header(vol_token))

    resp = client.post(
        f"/api/home-visits/{visit_id}/return",
        json={"reason": "Please add more detail to the health observation.", "sections": ["health_observations"]},
        headers=auth_header(admin_token),
    )
    assert resp.status_code == 200
    body = resp.get_json()["visit"]
    assert body["status"] == "Returned for Changes"
    assert body["return_reason"] == "Please add more detail to the health observation."
    assert body["return_sections"] == ["health_observations"]

    notifications = client.get("/api/notifications", headers=auth_header(vol_token)).get_json()["notifications"]
    assert any(n["notification_type"] == "Home Visit Returned" for n in notifications)

    # Volunteer can edit again now that it's back with them.
    edit = client.patch(f"/api/home-visits/{visit_id}", json={"observations": "Added more detail"}, headers=auth_header(vol_token))
    assert edit.status_code == 200

    # And resubmit, landing back in Under Review.
    resubmit = client.post(f"/api/home-visits/{visit_id}/submit", headers=auth_header(vol_token))
    assert resubmit.status_code == 200
    assert resubmit.get_json()["visit"]["status"] == "Under Review"

    submissions = client.get(f"/api/home-visits/{visit_id}/submissions", headers=auth_header(admin_token)).get_json()["submissions"]
    assert len(submissions) == 2
    assert submissions[0]["decision"] is None  # the new, not-yet-decided cycle
    assert submissions[1]["decision"] == "Returned"


def test_volunteer_cannot_return_a_visit(client, make_user, make_staff_user, auth_header):
    _, _, vol_token, visit_id = _assigned_and_started_visit(client, make_user, make_staff_user, auth_header)
    client.post(f"/api/home-visits/{visit_id}/submit", headers=auth_header(vol_token))

    resp = client.post(f"/api/home-visits/{visit_id}/return", json={"reason": "x"}, headers=auth_header(vol_token))
    assert resp.status_code == 403
