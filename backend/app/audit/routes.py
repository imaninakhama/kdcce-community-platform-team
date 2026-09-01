from datetime import timedelta

from flask import Blueprint, jsonify, request
from sqlalchemy import text

from ..auth.decorators import roles_required
from ..extensions import db
from ..models import AuditLog, LoginHistory, User, UserSession, utcnow
from ..utils import ReportFilterError, get_or_404, parse_date_range

bp = Blueprint("audit", __name__, url_prefix="/api/audit-logs")


@bp.get("")
@roles_required("admin")
def list_audit_logs():
    """Admin-only — this app's own change history across every sensitive
    action it tracks (user/role changes, session revocation, 2FA,
    verification/rejection decisions, ...), not something staff-level
    access extends to."""
    query = AuditLog.query

    resource_type = request.args.get("resource_type")
    if resource_type:
        query = query.filter_by(resource_type=resource_type)
    resource_id = request.args.get("resource_id", type=int)
    if resource_id is not None:
        query = query.filter_by(resource_id=resource_id)
    action = request.args.get("action")
    if action:
        query = query.filter_by(action=action)
    actor_id = request.args.get("actor_id", type=int)
    if actor_id is not None:
        query = query.filter_by(actor_id=actor_id)

    try:
        date_from, date_to = parse_date_range(request.args)
    except ReportFilterError as err:
        return jsonify(error="Validation failed", details={err.field: [err.message]}), 400
    if date_from:
        query = query.filter(db.func.date(AuditLog.created_at) >= date_from.isoformat())
    if date_to:
        query = query.filter(db.func.date(AuditLog.created_at) <= date_to.isoformat())

    page = max(request.args.get("page", 1, type=int), 1)
    per_page = min(max(request.args.get("per_page", 25, type=int), 1), 100)
    query = query.order_by(AuditLog.created_at.desc())
    total = query.count()
    items = query.offset((page - 1) * per_page).limit(per_page).all()

    return jsonify(
        audit_logs=[a.to_dict() for a in items],
        pagination={"page": page, "per_page": per_page, "total": total, "pages": (total + per_page - 1) // per_page if per_page else 0},
    ), 200


@bp.get("/<int:log_id>")
@roles_required("admin")
def get_audit_log(log_id):
    entry = get_or_404(AuditLog, log_id)
    return jsonify(audit_log=entry.to_dict()), 200


@bp.get("/security-overview")
@roles_required("admin")
def security_overview():
    """A single aggregate read across sessions/users/login history/audit
    log for the admin Security dashboard — deliberately read-only and
    cheap (small counts + capped recent-activity lists), not a general
    reporting endpoint."""
    try:
        db.session.execute(text("SELECT 1"))
        db_connected = True
    except Exception:
        db_connected = False

    now = utcnow()
    active_session_count = (
        UserSession.query.filter(UserSession.revoked_at.is_(None), UserSession.expires_at > now).count()
    )
    disabled_account_count = User.query.filter(User.active.is_(False), User.deleted_at.is_(None)).count()

    admins = User.query.filter_by(role="admin").filter(User.deleted_at.is_(None)).all()
    admin_2fa_enabled = sum(1 for a in admins if a.totp_enabled)

    since = now - timedelta(hours=24)
    recent_failed_logins = (
        LoginHistory.query.filter(LoginHistory.success.is_(False), LoginHistory.created_at >= since)
        .order_by(LoginHistory.created_at.desc()).limit(10).all()
    )
    recent_critical_events = AuditLog.query.order_by(AuditLog.created_at.desc()).limit(10).all()

    return jsonify(
        db_connected=db_connected,
        active_session_count=active_session_count,
        disabled_account_count=disabled_account_count,
        admin_2fa_coverage={"enabled": admin_2fa_enabled, "total": len(admins)},
        recent_failed_logins=[l.to_dict() for l in recent_failed_logins],
        recent_critical_events=[e.to_dict() for e in recent_critical_events],
    ), 200
