from datetime import date, timedelta


def test_new_volunteer_has_a_pending_profile(client, make_user, auth_header):
    _, access_token, _ = make_user(email="vol1@example.com")
    resp = client.get("/api/volunteers/me", headers=auth_header(access_token))
    assert resp.status_code == 200
    body = resp.get_json()["volunteer"]
    assert body["status"] == "Pending"
    assert body["email"] == "vol1@example.com"


def test_staff_has_no_volunteer_profile(client, make_staff_user, auth_header):
    _, token = make_staff_user("staff")
    resp = client.get("/api/volunteers/me", headers=auth_header(token))
    assert resp.status_code == 404


def test_volunteer_can_edit_own_profile(client, make_user, auth_header):
    _, access_token, _ = make_user(email="vol2@example.com")
    resp = client.patch("/api/volunteers/me", json={"skills": "Cooking, first aid", "availability": "Weekday mornings"}, headers=auth_header(access_token))
    assert resp.status_code == 200
    body = resp.get_json()["volunteer"]
    assert body["skills"] == "Cooking, first aid"
    assert body["status"] == "Pending"  # unchanged


def test_volunteer_cannot_set_own_status(client, make_user, auth_header):
    _, access_token, _ = make_user(email="vol3@example.com")
    resp = client.patch("/api/volunteers/me", json={"status": "Verified"}, headers=auth_header(access_token))
    assert resp.status_code == 400  # "status" is not a field on the self-update schema


def test_self_update_partial_edit_does_not_clear_other_fields(client, make_user, auth_header):
    _, access_token, _ = make_user(email="vol4@example.com")
    client.patch("/api/volunteers/me", json={"skills": "Cooking", "bio": "Loves the elderly"}, headers=auth_header(access_token))
    patched = client.patch("/api/volunteers/me", json={"availability": "Weekends"}, headers=auth_header(access_token))
    body = patched.get_json()["volunteer"]
    assert body["skills"] == "Cooking"
    assert body["bio"] == "Loves the elderly"
    assert body["availability"] == "Weekends"


def test_me_requires_auth(client):
    resp = client.get("/api/volunteers/me")
    assert resp.status_code == 401


# ---------- Application (extends the same self-update path) ----------

def test_volunteer_can_submit_full_application_via_self_update(client, make_user, auth_header):
    """The public 'Become a Volunteer' flow is register, then this PATCH —
    no separate application endpoint. All of these fields must round-trip."""
    _, access_token, _ = make_user(email="applicant1@example.com")
    resp = client.patch(
        "/api/volunteers/me",
        json={
            "phone": "0712345678",
            "skills": "First aid, community outreach",
            "availability": "Weekends",
            "areas_of_interest": "Home visits, feeding program",
            "experience": "Two years volunteering at a local shelter",
            "motivation": "I want to give back to my community",
            "bio": "Retired teacher, enjoys spending time with elders",
        },
        headers=auth_header(access_token),
    )
    assert resp.status_code == 200
    body = resp.get_json()["volunteer"]
    assert body["areas_of_interest"] == "Home visits, feeding program"
    assert body["experience"] == "Two years volunteering at a local shelter"
    assert body["motivation"] == "I want to give back to my community"
    assert body["status"] == "Pending"


def test_applicant_cannot_set_rejection_reason_on_self(client, make_user, auth_header):
    _, access_token, _ = make_user(email="applicant2@example.com")
    resp = client.patch("/api/volunteers/me", json={"rejection_reason": "I approve myself"}, headers=auth_header(access_token))
    assert resp.status_code == 400  # not a field on the self-update schema


def test_applicant_cannot_approve_self_via_crafted_payload(client, make_user, auth_header):
    """A payload mixing a legitimate self-editable field with status must
    be rejected wholesale — marshmallow's unknown-field handling means the
    whole request 400s rather than silently dropping just 'status'."""
    _, access_token, _ = make_user(email="applicant3@example.com")
    resp = client.patch(
        "/api/volunteers/me",
        json={"bio": "Trustworthy, promise", "status": "Verified"},
        headers=auth_header(access_token),
    )
    assert resp.status_code == 400
    profile = client.get("/api/volunteers/me", headers=auth_header(access_token)).get_json()["volunteer"]
    assert profile["status"] == "Pending"


# ---------- New application fields: dob, county, hours, emergency contact, consents ----------

def _dob_years_ago(years):
    today = date.today()
    try:
        return today.replace(year=today.year - years)
    except ValueError:
        # today is Feb 29 and (today.year - years) isn't a leap year
        return today.replace(month=2, day=28, year=today.year - years)


def test_volunteer_can_submit_full_application_with_new_fields(client, make_user, auth_header):
    _, access_token, _ = make_user(email="applicant4@example.com")
    dob = _dob_years_ago(25)
    resp = client.patch(
        "/api/volunteers/me",
        json={
            "phone": "0712345678",
            "skills": "First aid",
            "availability": "Weekends",
            "areas_of_interest": "Home visits",
            "experience": "Two years",
            "motivation": "I want to give back",
            "date_of_birth": dob.isoformat(),
            "county": "Kisumu",
            "min_hours_available": 4,
            "emergency_contact_name": "John Mwangi",
            "emergency_contact_phone": "0722334455",
            "code_of_conduct_agreed": True,
            "privacy_consent_agreed": True,
            "accuracy_declaration_agreed": True,
        },
        headers=auth_header(access_token),
    )
    assert resp.status_code == 200
    body = resp.get_json()["volunteer"]
    assert body["date_of_birth"] == dob.isoformat()
    assert body["county"] == "Kisumu"
    assert body["min_hours_available"] == 4
    assert body["emergency_contact_name"] == "John Mwangi"
    assert body["emergency_contact_phone"] == "0722334455"
    assert body["code_of_conduct_agreed"] is True
    assert body["privacy_consent_agreed"] is True
    assert body["accuracy_declaration_agreed"] is True


def test_underage_date_of_birth_is_rejected(client, make_user, auth_header):
    _, access_token, _ = make_user(email="applicant5@example.com")
    dob = _dob_years_ago(17)
    resp = client.patch("/api/volunteers/me", json={"date_of_birth": dob.isoformat()}, headers=auth_header(access_token))
    assert resp.status_code == 400


def test_future_date_of_birth_is_rejected(client, make_user, auth_header):
    _, access_token, _ = make_user(email="applicant6@example.com")
    future = (date.today() + timedelta(days=1)).isoformat()
    resp = client.patch("/api/volunteers/me", json={"date_of_birth": future}, headers=auth_header(access_token))
    assert resp.status_code == 400


def test_exactly_18_years_old_is_accepted(client, make_user, auth_header):
    _, access_token, _ = make_user(email="applicant7@example.com")
    dob = _dob_years_ago(18)
    resp = client.patch("/api/volunteers/me", json={"date_of_birth": dob.isoformat()}, headers=auth_header(access_token))
    assert resp.status_code == 200
    assert resp.get_json()["volunteer"]["date_of_birth"] == dob.isoformat()


def test_min_hours_available_must_be_a_positive_integer(client, make_user, auth_header):
    _, access_token, _ = make_user(email="applicant8@example.com")
    zero = client.patch("/api/volunteers/me", json={"min_hours_available": 0}, headers=auth_header(access_token))
    assert zero.status_code == 400
    negative = client.patch("/api/volunteers/me", json={"min_hours_available": -3}, headers=auth_header(access_token))
    assert negative.status_code == 400
    positive = client.patch("/api/volunteers/me", json={"min_hours_available": 5}, headers=auth_header(access_token))
    assert positive.status_code == 200
    assert positive.get_json()["volunteer"]["min_hours_available"] == 5


def test_consent_booleans_reject_explicit_false(client, make_user, auth_header):
    _, access_token, _ = make_user(email="applicant9@example.com")
    resp = client.patch("/api/volunteers/me", json={"code_of_conduct_agreed": False}, headers=auth_header(access_token))
    assert resp.status_code == 400
    resp = client.patch("/api/volunteers/me", json={"privacy_consent_agreed": False}, headers=auth_header(access_token))
    assert resp.status_code == 400
    resp = client.patch("/api/volunteers/me", json={"accuracy_declaration_agreed": False}, headers=auth_header(access_token))
    assert resp.status_code == 400
    # Untouched fields default to False and stay False when never agreed to
    profile = client.get("/api/volunteers/me", headers=auth_header(access_token)).get_json()["volunteer"]
    assert profile["code_of_conduct_agreed"] is False
    assert profile["privacy_consent_agreed"] is False
    assert profile["accuracy_declaration_agreed"] is False


# ---------- Staff management ----------

def test_staff_can_list_volunteers(client, make_user, make_staff_user, auth_header):
    make_user(email="vol5@example.com")
    _, token = make_staff_user("admin")
    resp = client.get("/api/volunteers", headers=auth_header(token))
    assert resp.status_code == 200
    assert any(v["email"] == "vol5@example.com" for v in resp.get_json()["volunteers"])


def test_volunteer_cannot_list_all_volunteers(client, make_user, auth_header):
    _, access_token, _ = make_user(email="vol6@example.com")
    resp = client.get("/api/volunteers", headers=auth_header(access_token))
    assert resp.status_code == 403


def test_unauthenticated_cannot_list_volunteers(client):
    resp = client.get("/api/volunteers")
    assert resp.status_code == 401


def test_staff_can_verify_a_volunteer(client, make_user, make_staff_user, auth_header):
    _, _, _ = make_user(email="vol7@example.com")
    admin_user, admin_token = make_staff_user("admin")
    volunteer_id = client.get("/api/volunteers", headers=auth_header(admin_token)).get_json()["volunteers"][0]["id"]

    resp = client.patch(f"/api/volunteers/{volunteer_id}", json={"status": "Verified"}, headers=auth_header(admin_token))
    assert resp.status_code == 200
    body = resp.get_json()["volunteer"]
    assert body["status"] == "Verified"
    assert body["reviewed_by"] == admin_user["name"]
    assert body["reviewed_at"] is not None


def test_status_persists_across_partial_edit_by_staff(client, make_user, make_staff_user, auth_header):
    """Regression: PATCHing without status must not reset it back to Pending."""
    make_user(email="vol8@example.com")
    _, token = make_staff_user("admin")
    volunteer_id = client.get("/api/volunteers", headers=auth_header(token)).get_json()["volunteers"][0]["id"]
    client.patch(f"/api/volunteers/{volunteer_id}", json={"status": "Verified"}, headers=auth_header(token))

    patched = client.patch(f"/api/volunteers/{volunteer_id}", json={"phone": "0712345678"}, headers=auth_header(token))
    assert patched.status_code == 200
    assert patched.get_json()["volunteer"]["status"] == "Verified"
    assert patched.get_json()["volunteer"]["phone"] == "0712345678"


def test_volunteer_rejects_invalid_status(client, make_user, make_staff_user, auth_header):
    make_user(email="vol9@example.com")
    _, token = make_staff_user("admin")
    volunteer_id = client.get("/api/volunteers", headers=auth_header(token)).get_json()["volunteers"][0]["id"]
    resp = client.patch(f"/api/volunteers/{volunteer_id}", json={"status": "SuperVolunteer"}, headers=auth_header(token))
    assert resp.status_code == 400


def test_staff_can_reject_with_a_reason(client, make_user, make_staff_user, auth_header):
    make_user(email="vol11@example.com")
    _, token = make_staff_user("admin")
    volunteer_id = client.get("/api/volunteers", headers=auth_header(token)).get_json()["volunteers"][0]["id"]

    resp = client.patch(
        f"/api/volunteers/{volunteer_id}",
        json={"status": "Rejected", "rejection_reason": "We currently have enough volunteers for this area."},
        headers=auth_header(token),
    )
    assert resp.status_code == 200
    body = resp.get_json()["volunteer"]
    assert body["status"] == "Rejected"
    assert body["rejection_reason"] == "We currently have enough volunteers for this area."


def test_rejection_reason_is_cleared_on_a_later_reversal(client, make_user, make_staff_user, auth_header):
    make_user(email="vol12@example.com")
    _, token = make_staff_user("admin")
    volunteer_id = client.get("/api/volunteers", headers=auth_header(token)).get_json()["volunteers"][0]["id"]
    client.patch(f"/api/volunteers/{volunteer_id}", json={"status": "Rejected", "rejection_reason": "Not a fit right now."}, headers=auth_header(token))

    reversed_ = client.patch(f"/api/volunteers/{volunteer_id}", json={"status": "Verified"}, headers=auth_header(token))
    assert reversed_.get_json()["volunteer"]["rejection_reason"] is None


def test_list_filters_by_status(client, make_user, make_staff_user, auth_header):
    make_user(email="vol10@example.com")
    _, token = make_staff_user("admin")
    volunteer_id = client.get("/api/volunteers", headers=auth_header(token)).get_json()["volunteers"][0]["id"]
    client.patch(f"/api/volunteers/{volunteer_id}", json={"status": "Verified"}, headers=auth_header(token))

    verified = client.get("/api/volunteers?status=Verified", headers=auth_header(token))
    assert len(verified.get_json()["volunteers"]) == 1
    pending = client.get("/api/volunteers?status=Pending", headers=auth_header(token))
    assert len(pending.get_json()["volunteers"]) == 0
