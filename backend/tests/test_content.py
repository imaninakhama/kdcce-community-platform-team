import io

JPEG_BYTES = b"\xff\xd8\xff\xe0" + b"\x00" * 100
NOT_AN_IMAGE = b"this is definitely not an image file" + b"\x00" * 100
OVERSIZED_JPEG = b"\xff\xd8\xff\xe0" + b"\x00" * (5 * 1024 * 1024 + 1)


# ---------- Gallery ----------

def test_public_can_read_gallery(client, make_staff_user, auth_header):
    _, token = make_staff_user("admin")
    client.post("/api/admin/gallery", json={"url": "/images/example.jpg"}, headers=auth_header(token))
    resp = client.get("/api/gallery")
    assert resp.status_code == 200
    assert len(resp.get_json()["images"]) == 1


def test_volunteer_cannot_add_gallery_image(client, make_user, auth_header):
    _, access_token, _ = make_user()
    resp = client.post("/api/admin/gallery", json={"url": "/images/x.jpg"}, headers=auth_header(access_token))
    assert resp.status_code == 403


def test_gallery_create_rejects_missing_url(client, make_staff_user, auth_header):
    _, token = make_staff_user("admin")
    resp = client.post("/api/admin/gallery", json={}, headers=auth_header(token))
    assert resp.status_code == 400


def test_gallery_delete(client, make_staff_user, auth_header):
    _, token = make_staff_user("admin")
    image = client.post("/api/admin/gallery", json={"url": "/images/x.jpg"}, headers=auth_header(token)).get_json()["image"]
    resp = client.delete(f"/api/admin/gallery/{image['id']}", headers=auth_header(token))
    assert resp.status_code == 204


# ---------- Gallery: "Add Photo" file upload ----------

def test_gallery_upload_accepts_valid_jpeg_and_serves_it_back_publicly(client, make_staff_user, auth_header):
    _, token = make_staff_user("admin")
    resp = client.post(
        "/api/admin/gallery/upload",
        data={"image": (io.BytesIO(JPEG_BYTES), "photo.jpg")},
        content_type="multipart/form-data",
        headers=auth_header(token),
    )
    assert resp.status_code == 201
    image = resp.get_json()["image"]
    assert image["url"].startswith("/api/gallery/uploads/")

    # The uploaded photo needs to be visible on the unauthenticated public
    # Gallery page — no auth header on this request.
    served = client.get(image["url"])
    assert served.status_code == 200
    assert served.data == JPEG_BYTES


def test_gallery_upload_rejects_non_image_file(client, make_staff_user, auth_header):
    _, token = make_staff_user("admin")
    resp = client.post(
        "/api/admin/gallery/upload",
        data={"image": (io.BytesIO(NOT_AN_IMAGE), "notes.txt")},
        content_type="multipart/form-data",
        headers=auth_header(token),
    )
    assert resp.status_code == 400
    assert "image" in resp.get_json()["details"]


def test_gallery_upload_rejects_oversized_file(client, make_staff_user, auth_header):
    _, token = make_staff_user("admin")
    resp = client.post(
        "/api/admin/gallery/upload",
        data={"image": (io.BytesIO(OVERSIZED_JPEG), "big.jpg")},
        content_type="multipart/form-data",
        headers=auth_header(token),
    )
    assert resp.status_code == 400


def test_gallery_upload_requires_admin_or_staff(client, make_user, auth_header):
    _, access_token, _ = make_user()
    resp = client.post(
        "/api/admin/gallery/upload",
        data={"image": (io.BytesIO(JPEG_BYTES), "photo.jpg")},
        content_type="multipart/form-data",
        headers=auth_header(access_token),
    )
    assert resp.status_code == 403


def test_gallery_delete_removes_uploaded_file_from_disk(client, make_staff_user, auth_header):
    _, token = make_staff_user("admin")
    image = client.post(
        "/api/admin/gallery/upload",
        data={"image": (io.BytesIO(JPEG_BYTES), "photo.jpg")},
        content_type="multipart/form-data",
        headers=auth_header(token),
    ).get_json()["image"]

    client.delete(f"/api/admin/gallery/{image['id']}", headers=auth_header(token))
    assert client.get(image["url"]).status_code == 404


# ---------- Team ----------

VALID_MEMBER = {"name": "Derrick Ayieko", "role": "Program Coordinator", "image": "/images/team-derrick.jpg"}


def test_public_can_read_team(client, make_staff_user, auth_header):
    _, token = make_staff_user("admin")
    client.post("/api/admin/team", json=VALID_MEMBER, headers=auth_header(token))
    resp = client.get("/api/team")
    assert resp.status_code == 200
    assert resp.get_json()["team"][0]["name"] == "Derrick Ayieko"


def test_volunteer_cannot_create_team_member(client, make_user, auth_header):
    _, access_token, _ = make_user()
    resp = client.post("/api/admin/team", json=VALID_MEMBER, headers=auth_header(access_token))
    assert resp.status_code == 403


def test_team_create_rejects_missing_image(client, make_staff_user, auth_header):
    _, token = make_staff_user("admin")
    payload = {k: v for k, v in VALID_MEMBER.items() if k != "image"}
    resp = client.post("/api/admin/team", json=payload, headers=auth_header(token))
    assert resp.status_code == 400


def test_team_update_and_delete(client, make_staff_user, auth_header):
    _, token = make_staff_user("admin")
    member = client.post("/api/admin/team", json=VALID_MEMBER, headers=auth_header(token)).get_json()["member"]

    patched = client.patch(f"/api/admin/team/{member['id']}", json={"role": "Treasurer"}, headers=auth_header(token))
    assert patched.status_code == 200
    assert patched.get_json()["member"]["role"] == "Treasurer"

    deleted = client.delete(f"/api/admin/team/{member['id']}", headers=auth_header(token))
    assert deleted.status_code == 204
