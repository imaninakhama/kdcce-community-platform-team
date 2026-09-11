from flask import Blueprint, current_app, jsonify, request
from flask_jwt_extended import (
    create_access_token,
    decode_token,
    get_jwt,
    get_jwt_identity,
    jwt_required,
)
from marshmallow import ValidationError

from ..extensions import db, limiter
from ..models import RevokedToken, User, VolunteerProfile, VolunteerSession, utcnow
from ..utils import issue_tokens, validation_error_response
from ..volunteers.service import send_application_received_email
from .schemas import LoginSchema, RegisterSchema

bp = Blueprint("auth", __name__, url_prefix="/api/auth")

register_schema = RegisterSchema()
login_schema = LoginSchema()


@bp.post("/register")
@limiter.limit("10 per minute")
def register():
    payload = request.get_json(silent=True) or {}
    try:
        data = register_schema.load(payload)
    except ValidationError as err:
        return validation_error_response(err)

    if User.query.filter_by(email=data["email"].lower()).first():
        return jsonify(error="An account with that email already exists"), 409

    user = User(name=data["name"].strip(), email=data["email"].lower(), role="volunteer")
    user.set_password(data["password"])
    db.session.add(user)
    db.session.flush()

    profile = VolunteerProfile(user_id=user.id, status="Pending")
    db.session.add(profile)
    db.session.commit()

    try:
        send_application_received_email(user)
    except Exception:
        # Never let a flaky mail server break a successful registration —
        # the account and profile above are already committed regardless.
        current_app.logger.exception("Failed to send application-received email to %s", user.email)

    access_token, refresh_token = issue_tokens(user)
    return jsonify(user=user.to_dict(), access_token=access_token, refresh_token=refresh_token), 201


@bp.post("/login")
@limiter.limit("10 per minute")
def login():
    payload = request.get_json(silent=True) or {}
    try:
        data = login_schema.load(payload)
    except ValidationError as err:
        return validation_error_response(err)

    user = User.query.filter_by(email=data["email"].lower()).first()
    if user is None or not user.check_password(data["password"]):
        return jsonify(error="Invalid email or password"), 401

    access_token, refresh_token = issue_tokens(user)

    # Website-presence tracking only (see VolunteerSession's docstring) —
    # every other role is untouched, and this never affects the tokens
    # issued above.
    if user.role == "volunteer":
        now = utcnow()
        db.session.add(VolunteerSession(volunteer_id=user.id, login_at=now, last_seen_at=now))
        db.session.commit()

    return jsonify(user=user.to_dict(), access_token=access_token, refresh_token=refresh_token), 200


@bp.post("/refresh")
@jwt_required(refresh=True)
def refresh():
    user = db.session.get(User, int(get_jwt_identity()))
    if user is None:
        return jsonify(error="Invalid or expired token"), 401
    access_token = create_access_token(identity=str(user.id), additional_claims={"role": user.role})
    return jsonify(access_token=access_token), 200


@bp.get("/me")
@jwt_required()
def me():
    user = db.session.get(User, int(get_jwt_identity()))
    if user is None:
        return jsonify(error="Invalid or expired token"), 401
    return jsonify(user=user.to_dict()), 200


@bp.post("/logout")
@jwt_required()
def logout():
    db.session.add(RevokedToken(jti=get_jwt()["jti"]))

    payload = request.get_json(silent=True) or {}
    raw_refresh_token = payload.get("refresh_token")
    if raw_refresh_token:
        try:
            decoded = decode_token(raw_refresh_token)
        except Exception:
            decoded = None
        if decoded is not None and decoded.get("type") == "refresh":
            db.session.add(RevokedToken(jti=decoded["jti"]))

    # Closes whatever VolunteerSession login() opened for this user, if
    # any — a no-op for admin/staff, who never get one. Looked up by
    # identity rather than gated on the token's role claim so a session
    # still gets closed even if the caller's role changed mid-session.
    open_session = (
        VolunteerSession.query.filter_by(volunteer_id=int(get_jwt_identity()), logout_at=None)
        .order_by(VolunteerSession.login_at.desc()).first()
    )
    if open_session is not None:
        open_session.logout_at = utcnow()

    db.session.commit()
    return "", 204


@bp.post("/heartbeat")
@jwt_required()
def heartbeat():
    """Keeps a volunteer's active VolunteerSession looking "recently seen"
    — called on an interval by the volunteer portal while it's open. Not
    an error if there's no open session (role isn't volunteer, or they
    logged in before this endpoint existed / already logged out
    elsewhere) — the caller doesn't need to know or care, it just stops
    mattering for "online" purposes once beats stop arriving."""
    open_session = (
        VolunteerSession.query.filter_by(volunteer_id=int(get_jwt_identity()), logout_at=None)
        .order_by(VolunteerSession.login_at.desc()).first()
    )
    if open_session is None:
        return "", 204
    open_session.last_seen_at = utcnow()
    db.session.commit()
    return "", 204
