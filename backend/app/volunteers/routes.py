from datetime import timezone

from flask import Blueprint, current_app, jsonify, request
from flask_jwt_extended import get_jwt, get_jwt_identity, jwt_required
from marshmallow import ValidationError

from ..auth.decorators import roles_required
from ..extensions import db, limiter
from ..models import AssistanceRequest, FollowUp, HomeVisit, VolunteerInvitation, VolunteerProfile, utcnow
from ..notifications.service import notify
from ..utils import get_or_404, issue_tokens, validation_error_response
from .schemas import VolunteerSelfUpdateSchema, VolunteerStaffUpdateSchema
from .service import create_invitation, send_approved_email, send_rejected_email

bp = Blueprint("volunteers", __name__, url_prefix="/api/volunteers")

self_schema = VolunteerSelfUpdateSchema()
staff_schema = VolunteerStaffUpdateSchema()


def _as_naive_utc(dt):
    """SQLite does not reliably round-trip a DateTime(timezone=True)
    column's tzinfo across a session boundary — a value just assigned in
    Python this request is timezone-aware, but the identical column
    re-loaded fresh from the database can come back naive. Needed here to
    compare an invitation's expires_at against a freshly-computed
    utcnow() without a spurious naive-vs-aware TypeError."""
    return dt.astimezone(timezone.utc).replace(tzinfo=None) if dt.tzinfo is not None else dt


def _is_verified_volunteer(user_id):
    profile = VolunteerProfile.query.filter_by(user_id=user_id).first()
    return profile is not None and profile.status == "Verified"


# ---------- Self-service ----------

@bp.get("/me")
@jwt_required()
def get_my_profile():
    profile = VolunteerProfile.query.filter_by(user_id=int(get_jwt_identity())).first()
    if profile is None:
        return jsonify(error="No volunteer profile on this account"), 404
    return jsonify(volunteer=profile.to_dict()), 200


@bp.patch("/me")
@jwt_required()
def update_my_profile():
    profile = VolunteerProfile.query.filter_by(user_id=int(get_jwt_identity())).first()
    if profile is None:
        return jsonify(error="No volunteer profile on this account"), 404

    payload = request.get_json(silent=True) or {}
    try:
        data = self_schema.load(payload, partial=True)
    except ValidationError as err:
        return validation_error_response(err)

    for field, value in data.items():
        setattr(profile, field, value)
    db.session.commit()
    return jsonify(volunteer=profile.to_dict()), 200


@bp.get("/me/elderly-members")
@jwt_required()
def list_my_elderly_members():
    """A verified volunteer's own, narrow view of the elderly people they
    currently work with — derived entirely from their own open HomeVisit/
    AssistanceRequest assignments, never a grant of general ElderlyMember
    access (elderly/routes.py stays admin/staff-only, unchanged). This is
    the volunteer-safe subset: name, member ID, and dates — never
    vulnerability_notes/health_notes, which stay admin/staff-only."""
    role = get_jwt().get("role")
    identity = int(get_jwt_identity())
    if role != "volunteer" or not _is_verified_volunteer(identity):
        return jsonify(error="Forbidden"), 403

    visits = HomeVisit.query.filter(HomeVisit.assigned_to_id == identity, HomeVisit.status != "Cancelled").all()
    requests_ = AssistanceRequest.query.filter(AssistanceRequest.assigned_to_id == identity, AssistanceRequest.status != "Cancelled").all()

    by_member = {}
    for v in visits:
        by_member.setdefault(v.elderly_member_id, {"member": v.elderly_member, "items": []})["items"].append(v)
    for r in requests_:
        by_member.setdefault(r.elderly_member_id, {"member": r.elderly_member, "items": []})["items"].append(r)

    result = []
    for entry in by_member.values():
        member = entry["member"]
        items = entry["items"]
        completed = [x.completed_at for x in items if x.status == "Completed" and x.completed_at]
        upcoming = [x.scheduled_at for x in items if x.scheduled_at and x.status not in ("Completed", "Cancelled")]
        result.append({
            "id": member.id,
            "member_id": member.member_id,
            "full_name": member.full_name,
            "last_visit": max(completed).isoformat() if completed else None,
            "next_assignment": min(upcoming).isoformat() if upcoming else None,
        })
    result.sort(key=lambda m: m["full_name"])
    return jsonify(elderly_members=result), 200


@bp.get("/me/elderly-members/<int:member_id>")
@jwt_required()
def get_my_elderly_member(member_id):
    """The care snapshot for one elderly member — 404s (not 403) if this
    member isn't currently one of the caller's own assignments, the same
    "looks like it doesn't exist" pattern notifications/routes.py already
    uses for identity-scoped lookups, so a volunteer can never confirm
    another elderly member even exists by probing IDs here."""
    role = get_jwt().get("role")
    identity = int(get_jwt_identity())
    if role != "volunteer" or not _is_verified_volunteer(identity):
        return jsonify(error="Forbidden"), 403

    visits = HomeVisit.query.filter(
        HomeVisit.assigned_to_id == identity, HomeVisit.elderly_member_id == member_id
    ).order_by(HomeVisit.created_at.desc()).all()
    requests_ = AssistanceRequest.query.filter(
        AssistanceRequest.assigned_to_id == identity, AssistanceRequest.elderly_member_id == member_id
    ).order_by(AssistanceRequest.created_at.desc()).all()

    if not visits and not requests_:
        return jsonify(error="Elderly member not found"), 404

    member = visits[0].elderly_member if visits else requests_[0].elderly_member
    completed_visits = [v for v in visits if v.status == "Completed" and v.completed_at]
    last_visit = max(completed_visits, key=lambda v: v.completed_at, default=None)
    open_items = [x for x in (visits + requests_) if x.scheduled_at and x.status not in ("Completed", "Cancelled")]
    next_assignment = min(open_items, key=lambda x: x.scheduled_at, default=None)
    follow_ups = FollowUp.query.filter(
        FollowUp.elderly_member_id == member_id, FollowUp.assigned_to_id == identity
    ).order_by(FollowUp.created_at.desc()).all()

    return jsonify(elderly_member={
        "id": member.id,
        "member_id": member.member_id,
        "full_name": member.full_name,
        "dietary_requirements": member.dietary_requirements,
        "allergies": member.allergies,
        "assigned_volunteer_id": identity,
        "next_assignment": ({
            "kind": "home_visit" if isinstance(next_assignment, HomeVisit) else "assistance_request",
            "id": next_assignment.id,
            "scheduled_at": next_assignment.scheduled_at.isoformat(),
        } if next_assignment else None),
        "recent_visit": ({
            "id": last_visit.id,
            "completed_at": last_visit.completed_at.isoformat(),
            "observations": last_visit.observations,
            "support_provided": last_visit.support_provided,
        } if last_visit else None),
        "follow_ups": [f.to_dict() for f in follow_ups],
    }), 200


# ---------- Staff management ----------

@bp.get("")
@roles_required("admin", "staff")
def list_volunteers():
    query = VolunteerProfile.query
    status = request.args.get("status")
    if status:
        query = query.filter(VolunteerProfile.status == status)
    profiles = query.order_by(VolunteerProfile.created_at.desc()).all()
    return jsonify(volunteers=[p.to_dict() for p in profiles]), 200


@bp.get("/<int:volunteer_id>")
@roles_required("admin", "staff")
def get_volunteer(volunteer_id):
    profile = get_or_404(VolunteerProfile, volunteer_id)
    return jsonify(volunteer=profile.to_dict()), 200


@bp.patch("/<int:volunteer_id>")
@roles_required("admin", "staff")
def update_volunteer(volunteer_id):
    profile = get_or_404(VolunteerProfile, volunteer_id)
    payload = request.get_json(silent=True) or {}
    try:
        data = staff_schema.load(payload, partial=True)
    except ValidationError as err:
        return validation_error_response(err)

    # Comparing against the CURRENT status (before any field is applied
    # below) is what makes this safe to call repeatedly: re-opening or
    # re-saving an already-Verified/Rejected volunteer with the same
    # status is a no-op here, so it can never re-send an approval or
    # rejection email that already went out.
    status_changed = "status" in data and data["status"] != profile.status
    new_status = data.get("status")
    reason = data.get("rejection_reason")

    if status_changed:
        profile.reviewed_by_id = int(get_jwt_identity())
        profile.reviewed_at = utcnow()
        if new_status == "Verified":
            notify(
                profile.user_id, "Volunteer Verified", "You're verified!",
                "Your volunteer application has been verified. You can now be assigned to home visits and assistance requests.",
                related_resource_type="volunteer_profile", related_resource_id=profile.id,
            )
        elif new_status == "Rejected":
            message = "Your KDCCE volunteer application was not approved."
            if reason:
                message += f" Reason: {reason}"
            notify(
                profile.user_id, "Volunteer Rejected", "Volunteer application update",
                message,
                related_resource_type="volunteer_profile", related_resource_id=profile.id,
            )
        if new_status != "Rejected":
            # A reason only ever makes sense attached to the rejection it
            # explains — clear any stale one left over from an earlier
            # rejection that was later reversed, so it can't resurface
            # attached to a different decision.
            data["rejection_reason"] = None

    for field, value in data.items():
        setattr(profile, field, value)
    db.session.commit()  # the decision itself is durably saved before anything email-related is even attempted

    # Email is a best-effort side effect of a decision that has ALREADY
    # committed above — a failure here (network blip, bad provider key,
    # Resend's unverified-domain restriction, whatever) must never look
    # like it undid the approval/rejection, and never rolls it back.
    # Isolated in its own try/except with its own commit so an error
    # from create_invitation itself can't take the status change down
    # with it either.
    email_sent = None
    if status_changed and new_status == "Verified":
        try:
            invitation = create_invitation(profile)
            email_sent = send_approved_email(profile.user, invitation)
            db.session.commit()
        except Exception:
            db.session.rollback()
            email_sent = False
            current_app.logger.exception("Failed to send approval email to %s", profile.user.email)
    elif status_changed and new_status == "Rejected":
        try:
            email_sent = send_rejected_email(profile.user, reason)
        except Exception:
            email_sent = False
            current_app.logger.exception("Failed to send rejection email to %s", profile.user.email)

    body = profile.to_dict()
    body["email_sent"] = email_sent
    return jsonify(volunteer=body), 200


# ---------- Invitation acceptance ----------
# Public, unauthenticated — the volunteer clicking the link in their
# approval email has no session yet; accepting one is what creates it.
# Never a login *gate*: the same volunteer can already sign in normally
# with the password they set at registration the moment they're Verified
# (see auth/routes.py login()), whether or not they ever open this link.

def _get_invitation_or_error(token):
    invitation = VolunteerInvitation.query.filter_by(token=token).first()
    if invitation is None:
        return None, (jsonify(error="This invitation link isn't valid."), 404)
    if invitation.accepted_at is not None:
        return None, (jsonify(error="This invitation has already been used. You can sign in with your existing account."), 409)
    if _as_naive_utc(invitation.expires_at) < _as_naive_utc(utcnow()):
        return None, (jsonify(error="This invitation link has expired. You can still sign in with your existing account."), 410)
    return invitation, None


@bp.get("/invitations/<token>")
@limiter.limit("20 per minute")
def get_invitation(token):
    invitation, err = _get_invitation_or_error(token)
    if err:
        return err
    return jsonify(volunteer_name=invitation.volunteer_profile.user.name), 200


@bp.post("/invitations/<token>/accept")
@limiter.limit("10 per minute")
def accept_invitation(token):
    invitation, err = _get_invitation_or_error(token)
    if err:
        return err

    invitation.accepted_at = utcnow()
    user = invitation.volunteer_profile.user
    access_token, refresh_token = issue_tokens(user)
    db.session.commit()
    return jsonify(user=user.to_dict(), access_token=access_token, refresh_token=refresh_token), 200
