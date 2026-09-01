from functools import wraps

from flask import jsonify
from flask_jwt_extended import get_jwt, verify_jwt_in_request
from flask_jwt_extended.exceptions import JWTExtendedException
from jwt.exceptions import PyJWTError


def roles_required(*roles):
    """Standalone auth+role guard — verifies the JWT itself (never stacked
    with a separate @jwt_required()) and checks the token's `role` claim.
    401 on a missing/invalid/expired/revoked token, 403 on a valid token
    with the wrong role."""

    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            try:
                verify_jwt_in_request()
            except (JWTExtendedException, PyJWTError):
                return jsonify(error="Authentication required"), 401

            if get_jwt().get("role") not in roles:
                return jsonify(error="Forbidden"), 403
            return fn(*args, **kwargs)

        return wrapper

    return decorator
