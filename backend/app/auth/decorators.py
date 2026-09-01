from functools import wraps

from flask import jsonify
from flask_jwt_extended import get_jwt, get_jwt_identity, verify_jwt_in_request
from flask_jwt_extended.exceptions import JWTExtendedException
from jwt.exceptions import PyJWTError


def roles_required(*roles):
    """Standalone auth+role guard — verifies the JWT itself (never stacked
    with a separate @jwt_required()) and checks the token's `role` claim.
    401 on a missing/invalid/expired/revoked token, 403 on a valid token
    with the wrong role.

    Also re-checks the user is still active and not soft-deleted on every
    call, not just at token-mint time. Without this, deactivating or
    deleting an admin/staff account would have no effect on any access
    token they minted before that point until it naturally expires (up
    to 1h) — every role-gated route already funnels through this one
    decorator, so this is the single place to close that gap for all of
    them at once."""

    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            try:
                verify_jwt_in_request()
            except (JWTExtendedException, PyJWTError):
                return jsonify(error="Authentication required"), 401

            if get_jwt().get("role") not in roles:
                return jsonify(error="Forbidden"), 403

            from ..extensions import db
            from ..models import User

            user = db.session.get(User, int(get_jwt_identity()))
            if user is None or not user.active or user.deleted_at is not None:
                return jsonify(error="Forbidden"), 403

            return fn(*args, **kwargs)

        return wrapper

    return decorator
