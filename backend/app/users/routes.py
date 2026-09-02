from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity
from marshmallow import ValidationError

from ..auth.decorators import roles_required
from ..extensions import db
from ..models import User
from ..utils import get_or_404, validation_error_response
from .schemas import AdminUserCreateSchema, MANAGEABLE_ROLES

bp = Blueprint("users", __name__, url_prefix="/api/admin/users")

schema = AdminUserCreateSchema()


@bp.get("")
@roles_required("admin")
def list_users():
    """Admin-only by design — the brief's "Staff: content only, no user
    management" distinction is meaningless unless managing OTHER staff/
    admin accounts is something only Admin can reach at all, not just a
    hidden UI link. Volunteers never appear here — see app/volunteers/
    for that separate, unrelated approval workflow."""
    users = User.query.filter(User.role.in_(MANAGEABLE_ROLES)).order_by(User.created_at.asc()).all()
    return jsonify(users=[u.to_dict() for u in users]), 200


@bp.post("")
@roles_required("admin")
def create_user():
    payload = request.get_json(silent=True) or {}
    try:
        data = schema.load(payload)
    except ValidationError as err:
        return validation_error_response(err)

    if User.query.filter_by(email=data["email"].lower()).first():
        return jsonify(error="An account with that email already exists"), 409

    user = User(name=data["name"].strip(), email=data["email"].lower(), role=data["role"])
    user.set_password(data["password"])
    db.session.add(user)
    db.session.commit()
    return jsonify(user=user.to_dict()), 201


@bp.delete("/<int:user_id>")
@roles_required("admin")
def delete_user(user_id):
    user = get_or_404(User, user_id)
    if user.role not in MANAGEABLE_ROLES:
        return jsonify(error="Not found"), 404

    if user.id == int(get_jwt_identity()):
        # The only path to zero admins would be an admin deleting
        # themselves — blocking that here means an admin account can
        # never be deleted down to none by this endpoint at all.
        return jsonify(error="You cannot remove your own account"), 409

    db.session.delete(user)
    db.session.commit()
    return "", 204
