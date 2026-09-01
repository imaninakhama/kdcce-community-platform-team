from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt, get_jwt_identity, jwt_required
from marshmallow import ValidationError

from ..achievements.service import check_and_award, current_achievement_value
from ..auth.decorators import roles_required
from ..extensions import db
from ..models import (
    Achievement, AssistanceRequest, FollowUp, HomeVisit, VolunteerAchievement, VolunteerHours,
    VolunteerProfile, utcnow,
)
from ..notifications.service import notify
from ..utils import get_or_404, validation_error_response
from ..volunteer_hours import service as hours_service
from .schemas import (
    ManualHoursCreateSchema, ManualHoursReviewSchema, RecognitionCreateSchema,
    VolunteerSelfUpdateSchema, VolunteerStaffUpdateSchema,
)

bp = Blueprint("volunteers", __name__, url_prefix="/api/volunteers")

self_schema = VolunteerSelfUpdateSchema()
staff_schema = VolunteerStaffUpdateSchema()
manual_hours_schema = ManualHoursCreateSchema()
manual_hours_review_schema = ManualHoursReviewSchema()
recognition_schema = RecognitionCreateSchema()


def _my_profile_or_error():
    profile = VolunteerProfile.query.filter_by(user_id=int(get_jwt_identity())).first()
    if profile is None:
        return None, (jsonify(error="No volunteer profile on this account"), 404)
    return profile, None


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

    if "status" in data and data["status"] != profile.status:
        profile.reviewed_by_id = int(get_jwt_identity())
        profile.reviewed_at = utcnow()
        if data["status"] == "Verified":
            notify(
                profile.user_id, "Volunteer Verified", "You're verified!",
                "Your volunteer application has been verified. You can now be assigned to home visits and assistance requests.",
                related_resource_type="volunteer_profile", related_resource_id=profile.id,
            )
        elif data["status"] == "Rejected":
            reason = data.get("rejection_reason")
            message = "Your KDCCE volunteer application was not approved."
            if reason:
                message += f" Reason: {reason}"
            notify(
                profile.user_id, "Volunteer Rejected", "Volunteer application update",
                message,
                related_resource_type="volunteer_profile", related_resource_id=profile.id,
            )
        if data["status"] != "Rejected":
            # A reason only ever makes sense attached to the rejection it
            # explains — clear any stale one left over from an earlier
            # rejection that was later reversed, so it can't resurface
            # attached to a different decision.
            data["rejection_reason"] = None

    for field, value in data.items():
        setattr(profile, field, value)
    db.session.commit()
    return jsonify(volunteer=profile.to_dict()), 200


# ---------- Hours ----------

@bp.get("/me/hours")
@jwt_required()
def get_my_hours():
    profile, err = _my_profile_or_error()
    if err:
        return err
    return jsonify(hours=hours_service.summary(int(get_jwt_identity()), profile.id)), 200


@bp.get("/me/hours/entries")
@jwt_required()
def list_my_manual_hours():
    profile, err = _my_profile_or_error()
    if err:
        return err
    entries = VolunteerHours.query.filter_by(volunteer_profile_id=profile.id).order_by(VolunteerHours.date.desc()).all()
    return jsonify(entries=[e.to_dict() for e in entries]), 200


@bp.post("/me/hours")
@jwt_required()
def submit_my_hours():
    profile, err = _my_profile_or_error()
    if err:
        return err
    payload = request.get_json(silent=True) or {}
    try:
        data = manual_hours_schema.load(payload)
    except ValidationError as err:
        return validation_error_response(err)
    entry = VolunteerHours(volunteer_profile_id=profile.id, **data, status="Pending")
    db.session.add(entry)
    db.session.commit()
    return jsonify(entry=entry.to_dict()), 201


@bp.patch("/hours/<int:hours_id>")
@roles_required("admin", "staff")
def review_manual_hours(hours_id):
    """Reviewed by its own id, not nested under a volunteer id — a
    manual-hours entry is uniquely identified on its own."""
    entry = get_or_404(VolunteerHours, hours_id)
    if entry.status != "Pending":
        return jsonify(error=f"This entry has already been {entry.status.lower()}"), 409
    payload = request.get_json(silent=True) or {}
    try:
        data = manual_hours_review_schema.load(payload)
    except ValidationError as err:
        return validation_error_response(err)

    entry.status = data["status"]
    entry.rejection_reason = data.get("rejection_reason") if data["status"] == "Rejected" else None
    entry.approved_by_id = int(get_jwt_identity())
    entry.approved_at = utcnow()
    db.session.flush()

    if entry.status == "Approved":
        check_and_award(entry.volunteer_profile.user_id, entry.volunteer_profile_id)

    db.session.commit()
    return jsonify(entry=entry.to_dict()), 200


@bp.get("/<int:volunteer_id>/hours")
@roles_required("admin", "staff")
def get_volunteer_hours(volunteer_id):
    profile = get_or_404(VolunteerProfile, volunteer_id)
    return jsonify(hours=hours_service.summary(profile.user_id, profile.id)), 200


# ---------- Performance ----------

def _performance(profile):
    completed_visits = HomeVisit.query.filter_by(assigned_to_id=profile.user_id, status="Completed").count()
    completed_assistance = AssistanceRequest.query.filter_by(assigned_to_id=profile.user_id, status="Completed").count()
    cancelled_visits = HomeVisit.query.filter_by(assigned_to_id=profile.user_id, status="Cancelled").count()
    cancelled_assistance = AssistanceRequest.query.filter_by(assigned_to_id=profile.user_id, status="Cancelled").count()
    total_visits = HomeVisit.query.filter_by(assigned_to_id=profile.user_id).count()
    total_assistance = AssistanceRequest.query.filter_by(assigned_to_id=profile.user_id).count()
    completed = completed_visits + completed_assistance
    cancelled = cancelled_visits + cancelled_assistance
    total = total_visits + total_assistance
    decided = completed + cancelled
    hours = hours_service.summary(profile.user_id, profile.id)
    return {
        "total_service_minutes": hours["minutes_lifetime"],
        "minutes_this_month": hours["minutes_this_month"],
        "completed_home_visits": completed_visits,
        "completed_assistance_requests": completed_assistance,
        "total_completed_assignments": completed,
        "pending_assignments": total - completed - cancelled,
        "cancelled_assignments": cancelled,
        "completion_rate": round((completed / decided) * 100) if decided > 0 else None,
    }


@bp.get("/me/performance")
@jwt_required()
def get_my_performance():
    profile, err = _my_profile_or_error()
    if err:
        return err
    return jsonify(performance=_performance(profile)), 200


@bp.get("/<int:volunteer_id>/performance")
@roles_required("admin", "staff")
def get_volunteer_performance(volunteer_id):
    profile = get_or_404(VolunteerProfile, volunteer_id)
    return jsonify(performance=_performance(profile)), 200


# ---------- Achievements & recognition ----------

def _achievements_payload(profile):
    earned = VolunteerAchievement.query.filter_by(volunteer_profile_id=profile.id).order_by(VolunteerAchievement.awarded_at.desc()).all()
    earned_ids = {va.achievement_id for va in earned}
    candidates = Achievement.query.filter(Achievement.active.is_(True), Achievement.threshold_type != "manual").all()
    upcoming = [
        {**a.to_dict(), "current_value": current_achievement_value(a.threshold_type, profile.user_id, profile.id)}
        for a in candidates if a.id not in earned_ids
    ]
    return {"earned": [va.to_dict() for va in earned], "upcoming": upcoming}


@bp.get("/me/achievements")
@jwt_required()
def get_my_achievements():
    profile, err = _my_profile_or_error()
    if err:
        return err
    return jsonify(achievements=_achievements_payload(profile)), 200


@bp.get("/<int:volunteer_id>/achievements")
@roles_required("admin", "staff")
def get_volunteer_achievements(volunteer_id):
    profile = get_or_404(VolunteerProfile, volunteer_id)
    return jsonify(achievements=_achievements_payload(profile)), 200


@bp.post("/<int:volunteer_id>/recognition")
@roles_required("admin", "staff")
def recognize_volunteer(volunteer_id):
    """Recognition IS an achievement award — same VolunteerAchievement
    table, source="manual" — not a parallel awards system. Only accepts
    an achievement_id whose threshold_type is "manual" (Volunteer of the
    Month, Community Champion, ...); a threshold-based one is only ever
    earned automatically, never handed out manually."""
    profile = get_or_404(VolunteerProfile, volunteer_id)
    payload = request.get_json(silent=True) or {}
    try:
        data = recognition_schema.load(payload)
    except ValidationError as err:
        return validation_error_response(err)

    achievement = db.session.get(Achievement, data["achievement_id"])
    if achievement is None or not achievement.active or achievement.threshold_type != "manual":
        return jsonify(error="Validation failed", details={"achievement_id": ["Not a valid recognition award"]}), 400
    if VolunteerAchievement.query.filter_by(volunteer_profile_id=profile.id, achievement_id=achievement.id).first():
        return jsonify(error=f'{profile.user.name} has already received "{achievement.name}"'), 409

    record = VolunteerAchievement(
        volunteer_profile_id=profile.id, achievement_id=achievement.id, source="manual",
        awarded_by_id=int(get_jwt_identity()), notes=data.get("notes"),
    )
    db.session.add(record)
    db.session.flush()
    notify(
        profile.user_id, "Achievement Awarded", f'You\'ve been recognized: "{achievement.name}"!',
        data.get("notes") or achievement.description or f"You've been awarded {achievement.name}.",
        related_resource_type="achievement", related_resource_id=achievement.id,
    )
    db.session.commit()
    return jsonify(recognition=record.to_dict()), 201
