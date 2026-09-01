from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required

from ..models import Achievement

bp = Blueprint("achievements", __name__, url_prefix="/api/achievements")


@bp.get("")
@jwt_required()
def list_achievements():
    """The full definition set — any authenticated user (a volunteer sees
    this via their own achievements/upcoming view; admin/staff need it
    to build the recognition picker). Read-only: the starter set is
    seeded once by its own migration."""
    achievements = Achievement.query.order_by(Achievement.category.asc(), Achievement.name.asc()).all()
    return jsonify(achievements=[a.to_dict() for a in achievements]), 200
