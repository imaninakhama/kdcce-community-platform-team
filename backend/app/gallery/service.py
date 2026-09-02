import os
import uuid

from flask import current_app

MAX_PHOTO_SIZE = 5 * 1024 * 1024  # 5MB — same application-level limit as
# assignment-photo uploads (see app/assignments/service.py); config.py's
# MAX_CONTENT_LENGTH is a slightly higher hard backstop enforced before
# the request body is even parsed.


class GalleryUploadError(Exception):
    """Raised on a rejected upload (missing, wrong type, or too large).
    Routes catch this and turn it into the app's standard 400 shape, same
    pattern as AttachmentError in app/assignments/service.py."""

    def __init__(self, message):
        self.message = message
        super().__init__(message)


def _sniff_image_type(header):
    """Identify the file from its own bytes, never from the client's
    filename or Content-Type header — both are attacker-controlled and
    trivially spoofable. Only the three formats this app accepts."""
    if header[:3] == b"\xff\xd8\xff":
        return "image/jpeg", "jpg"
    if header[:8] == b"\x89PNG\r\n\x1a\n":
        return "image/png", "png"
    if header[:4] == b"RIFF" and header[8:12] == b"WEBP":
        return "image/webp", "webp"
    return None, None


def _upload_dir():
    # Unlike assignment photos (private, under instance/), gallery photos
    # are public content shown on the unauthenticated Gallery page — they
    # still live under instance/ (not app/static/) for a consistent
    # storage convention, but are served back out through a dedicated,
    # unauthenticated route (see routes.py's serve_upload).
    path = os.path.join(current_app.instance_path, "uploads", "gallery")
    os.makedirs(path, exist_ok=True)
    return path


def file_path(filename):
    return os.path.join(_upload_dir(), filename)


def save_gallery_photo(file_storage):
    """Validates the file's actual content and writes it to disk under a
    server-generated name (never the client's filename). Returns the
    filename to store on the GalleryImage row — the caller builds the
    public URL and creates/commits the record."""
    if file_storage is None or not file_storage.filename:
        raise GalleryUploadError("No file provided")

    header = file_storage.stream.read(16)
    file_storage.stream.seek(0)
    mime_type, extension = _sniff_image_type(header)
    if mime_type is None:
        raise GalleryUploadError("File must be a JPEG, PNG, or WebP image")

    data = file_storage.stream.read(MAX_PHOTO_SIZE + 1)
    if len(data) > MAX_PHOTO_SIZE:
        raise GalleryUploadError("File exceeds the 5MB limit")

    filename = f"{uuid.uuid4().hex}.{extension}"
    with open(file_path(filename), "wb") as f:
        f.write(data)

    return filename, mime_type
