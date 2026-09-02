import os

from flask import Blueprint, jsonify, request, send_from_directory
from marshmallow import ValidationError

from ..auth.decorators import roles_required
from ..extensions import db
from ..models import GalleryImage
from ..utils import get_or_404, validation_error_response
from .schemas import GalleryImageSchema
from .service import GalleryUploadError, file_path, save_gallery_photo

bp = Blueprint("gallery", __name__)

schema = GalleryImageSchema()

UPLOAD_URL_PREFIX = "/api/gallery/uploads/"


@bp.get("/api/gallery")
def list_images():
    images = GalleryImage.query.order_by(GalleryImage.created_at.desc()).all()
    return jsonify(images=[i.to_dict() for i in images]), 200


@bp.get("/api/gallery/uploads/<filename>")
def serve_upload(filename):
    """Public, unauthenticated — the Gallery page it serves has no login
    of its own. `<filename>` (not `<path:filename>`) never accepts a `/`,
    and every name on disk is a server-generated UUID (see
    service.save_gallery_photo), so there's nothing to path-traverse to
    even if a caller tried."""
    return send_from_directory(os.path.dirname(file_path(filename)), filename)


@bp.post("/api/admin/gallery")
@roles_required("admin", "staff")
def create_image():
    payload = request.get_json(silent=True) or {}
    try:
        data = schema.load(payload)
    except ValidationError as err:
        return validation_error_response(err)

    image = GalleryImage(**data)
    db.session.add(image)
    db.session.commit()
    return jsonify(image=image.to_dict()), 201


@bp.post("/api/admin/gallery/upload")
@roles_required("admin", "staff")
def upload_image():
    """The "Add Photo" action's actual entry point — a real file from the
    admin's device, not a typed-in URL. Validates the file's own bytes
    (never trusting the client's filename or Content-Type) and stores it
    under a server-generated name before creating the GalleryImage row,
    same shape/response as create_image() above so the frontend's list
    just gets a new entry either way."""
    try:
        filename, _mime_type = save_gallery_photo(request.files.get("image"))
    except GalleryUploadError as err:
        return jsonify(error="Validation failed", details={"image": [err.message]}), 400

    caption = (request.form.get("caption") or "").strip() or None
    image = GalleryImage(url=f"{UPLOAD_URL_PREFIX}{filename}", caption=caption)
    db.session.add(image)
    db.session.commit()
    return jsonify(image=image.to_dict()), 201


@bp.delete("/api/admin/gallery/<int:image_id>")
@roles_required("admin", "staff")
def delete_image(image_id):
    image = get_or_404(GalleryImage, image_id)
    # Only ever remove the underlying file for one we uploaded ourselves —
    # never touch anything at a URL we didn't generate (e.g. a static
    # /images/*.jpg path shared by other pages).
    if image.url.startswith(UPLOAD_URL_PREFIX):
        filename = image.url[len(UPLOAD_URL_PREFIX):]
        path = file_path(filename)
        if os.path.exists(path):
            os.remove(path)
    db.session.delete(image)
    db.session.commit()
    return "", 204
