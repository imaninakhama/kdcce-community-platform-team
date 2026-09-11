import json

from flask import Blueprint, jsonify, request, send_file
from flask_jwt_extended import get_jwt, get_jwt_identity, jwt_required
from marshmallow import ValidationError

from ..assignments.schemas import AssignmentMessageCreateSchema, AssignmentReviewCreateSchema, ChecklistItemUpdateSchema
from ..assignments.service import (
    AttachmentError, ChecklistError, attachment_file_path, get_attachment, get_checklist, get_review, list_messages,
    save_photo, send_message, set_checklist_item, submit_review,
)
from ..auth.decorators import roles_required
from ..extensions import db
from ..followups.service import create_from_source
from ..models import ElderlyMember, HomeVisit, HomeVisitSubmission, User, VolunteerProfile, utcnow
from ..notifications.service import notify
from ..utils import get_or_404, validation_error_response
from .schemas import HomeVisitAssigneeUpdateSchema, HomeVisitCreateSchema, HomeVisitReturnSchema, HomeVisitStaffUpdateSchema

bp = Blueprint("homevisits", __name__, url_prefix="/api/home-visits")

create_schema = HomeVisitCreateSchema()
staff_update_schema = HomeVisitStaffUpdateSchema()
assignee_update_schema = HomeVisitAssigneeUpdateSchema()
return_schema = HomeVisitReturnSchema()
message_schema = AssignmentMessageCreateSchema()
review_schema = AssignmentReviewCreateSchema()
checklist_schema = ChecklistItemUpdateSchema()

# Fields captured as part of the working visit form — snapshotted into a
# HomeVisitSubmission row on every submit-for-review, so "what did the
# volunteer actually submit this cycle" survives later edits/resubmits.
_SNAPSHOT_FIELDS = (
    "wellbeing", "mood", "blood_pressure_systolic", "blood_pressure_diastolic", "pulse_bpm",
    "temperature_celsius", "weight_kg", "physical_activity", "basic_needs_confirmed",
    "observations", "concerns_discussed", "follow_up_required", "follow_up_notes", "support_provided",
)
# Statuses in which the volunteer's own record is locked — matches "lock
# all fields... volunteer cannot edit or delete submitted information"
# for Under Review, plus the obvious case of an already-approved visit.
_LOCKED_STATUSES = ("Under Review", "Completed")


def _snapshot(visit):
    return json.dumps({field: getattr(visit, field) for field in _SNAPSHOT_FIELDS})


def _latest_submission(visit_id):
    return (
        HomeVisitSubmission.query.filter_by(home_visit_id=visit_id)
        .order_by(HomeVisitSubmission.submitted_at.desc()).first()
    )


def _member_or_400(member_id):
    if db.session.get(ElderlyMember, member_id) is None:
        return jsonify(error="Validation failed", details={"elderly_member_id": ["Elderly member not found"]}), 400
    return None


def _is_verified_volunteer(user_id):
    """A volunteer's access here must track their CURRENT status, not just
    whatever assigned_to_id was set to at assignment time — if a verified
    volunteer with active visits is later rejected, they must lose access
    to those visits immediately, even though assigned_to_id still points
    at them. Relying only on "assigned_to_id == me" would miss that case,
    since a rejection doesn't retroactively clear existing assignments."""
    profile = VolunteerProfile.query.filter_by(user_id=user_id).first()
    return profile is not None and profile.status == "Verified"


def _can_access_visit(visit, role, identity):
    """The single access rule for a visit's photo/messages — identical to
    the ownership check get_visit already applies to the visit itself, so
    photo/message access can never be broader than viewing the visit."""
    if role in ("admin", "staff"):
        return True
    return visit.assigned_to_id == identity and _is_verified_volunteer(identity)


def _locked_for_volunteer(visit, role):
    """Whether a non-admin/staff caller is blocked from changing the
    checklist/photo while the visit is Under Review or Completed — same
    lock the PATCH endpoint enforces on the visit's own fields. Admin/
    staff are never subject to this; they can still correct a record at
    any stage."""
    return role not in ("admin", "staff") and visit.status in _LOCKED_STATUSES


def _assignee_or_400(user_id):
    """A visit may be assigned to staff/admin (a caregiver) or a volunteer
    whose profile has been verified — never an unverified volunteer."""
    user = db.session.get(User, user_id)
    if user is None:
        return jsonify(error="Validation failed", details={"assigned_to_id": ["User not found"]}), 400
    if user.role in ("admin", "staff"):
        return None
    profile = VolunteerProfile.query.filter_by(user_id=user_id).first()
    if profile is None or profile.status != "Verified":
        return jsonify(error="Validation failed", details={"assigned_to_id": ["Can only assign staff or a verified volunteer"]}), 400
    return None


@bp.get("/assignees")
@roles_required("admin", "staff")
def list_assignees():
    """Who this visit could be assigned to: every staff/admin, plus any
    volunteer whose profile is Verified. Purpose-built for the assignment
    dropdown — there's no general user-listing endpoint in this app."""
    staff = User.query.filter(User.role.in_(("admin", "staff"))).order_by(User.name.asc()).all()
    verified = (
        db.session.query(User)
        .join(VolunteerProfile, VolunteerProfile.user_id == User.id)
        .filter(VolunteerProfile.status == "Verified")
        .order_by(User.name.asc())
        .all()
    )
    people = [{"id": u.id, "name": u.name, "role": u.role} for u in staff]
    people += [{"id": u.id, "name": u.name, "role": "volunteer"} for u in verified]
    return jsonify(assignees=people), 200


@bp.post("")
@roles_required("admin", "staff")
def create_visit():
    payload = request.get_json(silent=True) or {}
    try:
        data = create_schema.load(payload)
    except ValidationError as err:
        return validation_error_response(err)

    invalid = _member_or_400(data["elderly_member_id"])
    if invalid:
        return invalid
    if data.get("assigned_to_id") is not None:
        invalid = _assignee_or_400(data["assigned_to_id"])
        if invalid:
            return invalid

    data.setdefault("priority", "Medium")
    status = "Assigned" if data.get("assigned_to_id") else "Pending"
    visit = HomeVisit(**data, status=status, requested_by_id=int(get_jwt_identity()))
    db.session.add(visit)
    db.session.flush()  # assigns visit.id so the notification can reference it
    if visit.assigned_to_id:
        notify(
            visit.assigned_to_id, "Home Visit Assignment", "Home visit assigned to you",
            f"You have been assigned a home visit for {visit.elderly_member.full_name}.",
            related_resource_type="home_visit", related_resource_id=visit.id,
        )
    db.session.commit()
    return jsonify(visit=visit.to_dict()), 201


@bp.get("")
@jwt_required()
def list_visits():
    role = get_jwt().get("role")
    query = HomeVisit.query

    if role == "volunteer":
        if not _is_verified_volunteer(int(get_jwt_identity())):
            return jsonify(error="Forbidden"), 403
        query = query.filter(HomeVisit.assigned_to_id == int(get_jwt_identity()))
    elif role not in ("admin", "staff"):
        return jsonify(error="Forbidden"), 403
    else:
        assigned_to_id = request.args.get("assigned_to_id", type=int)
        if assigned_to_id:
            query = query.filter(HomeVisit.assigned_to_id == assigned_to_id)
        elderly_member_id = request.args.get("elderly_member_id", type=int)
        if elderly_member_id:
            query = query.filter(HomeVisit.elderly_member_id == elderly_member_id)

    status = request.args.get("status")
    if status:
        query = query.filter(HomeVisit.status == status)
    priority = request.args.get("priority")
    if priority:
        query = query.filter(HomeVisit.priority == priority)

    visits = query.order_by(HomeVisit.created_at.desc()).all()
    return jsonify(visits=[v.to_dict() for v in visits]), 200


@bp.get("/<int:visit_id>")
@jwt_required()
def get_visit(visit_id):
    visit = get_or_404(HomeVisit, visit_id)
    role = get_jwt().get("role")
    if role not in ("admin", "staff"):
        identity = int(get_jwt_identity())
        if visit.assigned_to_id != identity or not _is_verified_volunteer(identity):
            return jsonify(error="Forbidden"), 403
    return jsonify(visit=visit.to_dict()), 200


@bp.patch("/<int:visit_id>")
@jwt_required()
def update_visit(visit_id):
    visit = get_or_404(HomeVisit, visit_id)
    role = get_jwt().get("role")
    payload = request.get_json(silent=True) or {}

    if role in ("admin", "staff"):
        try:
            data = staff_update_schema.load(payload, partial=True)
        except ValidationError as err:
            return validation_error_response(err)
        if "elderly_member_id" in data:
            invalid = _member_or_400(data["elderly_member_id"])
            if invalid:
                return invalid
        if "assigned_to_id" in data and data["assigned_to_id"] is not None:
            invalid = _assignee_or_400(data["assigned_to_id"])
            if invalid:
                return invalid
    elif visit.assigned_to_id == int(get_jwt_identity()) and _is_verified_volunteer(int(get_jwt_identity())):
        if visit.status in _LOCKED_STATUSES:
            return jsonify(error=f"This visit is locked while it is '{visit.status}' — no edits are allowed."), 409
        try:
            data = assignee_update_schema.load(payload, partial=True)
        except ValidationError as err:
            return validation_error_response(err)
    else:
        return jsonify(error="Forbidden"), 403

    if data.get("status") in ("Started", "In Progress") and visit.started_at is None:
        data["started_at"] = utcnow()
    if data.get("status") == "Completed" and visit.completed_at is None:
        data["completed_at"] = utcnow()

    previous_assignee = visit.assigned_to_id
    was_follow_up_required = visit.follow_up_required
    for field, value in data.items():
        setattr(visit, field, value)

    if visit.assigned_to_id and visit.assigned_to_id != previous_assignee:
        notify(
            visit.assigned_to_id, "Home Visit Assignment", "Home visit assigned to you",
            f"You have been assigned a home visit for {visit.elderly_member.full_name}.",
            related_resource_type="home_visit", related_resource_id=visit.id,
        )

    if visit.follow_up_required and not was_follow_up_required:
        create_from_source(
            visit.elderly_member_id, "home_visit", visit.id,
            visit.follow_up_notes or f"Follow-up required after a home visit for {visit.elderly_member.full_name}.",
            int(get_jwt_identity()), assigned_to_id=visit.assigned_to_id,
        )

    db.session.commit()
    return jsonify(visit=visit.to_dict()), 200


@bp.post("/<int:visit_id>/accept")
@jwt_required()
def accept_visit(visit_id):
    """Acceptance is its own narrow action, not just another PATCH status
    value — only the assigned volunteer can call it, only on their own
    visit, only from Assigned. Mirrors assistance/routes.py's identical
    accept_request()."""
    visit = get_or_404(HomeVisit, visit_id)
    identity = int(get_jwt_identity())
    if visit.assigned_to_id != identity or not _is_verified_volunteer(identity):
        return jsonify(error="Forbidden"), 403
    if visit.status != "Assigned":
        return jsonify(error=f"Cannot accept a visit in '{visit.status}' status — it must be 'Assigned' first"), 409

    visit.status = "Accepted"
    db.session.commit()
    return jsonify(visit=visit.to_dict()), 200


@bp.post("/<int:visit_id>/submit")
@jwt_required()
def submit_visit(visit_id):
    """The only path to Under Review — always snapshots the current work
    fields into a new HomeVisitSubmission row and notifies every
    admin/staff account (same broadcast pattern as a critical incident;
    see incidents/routes.py), so a bare status PATCH could never
    substitute for this. Allowed from the working state or after a
    Returned-for-Changes correction, matching the workflow's
    "Returned for Changes -> ... -> Review Submission -> Under Review"
    cycle."""
    visit = get_or_404(HomeVisit, visit_id)
    identity = int(get_jwt_identity())
    if visit.assigned_to_id != identity or not _is_verified_volunteer(identity):
        return jsonify(error="Forbidden"), 403
    if visit.status not in ("Started", "In Progress", "Returned for Changes"):
        return jsonify(error=f"Cannot submit a visit in '{visit.status}' status for review"), 409

    now = utcnow()
    visit.status = "Under Review"
    visit.submitted_at = now
    visit.returned_at = None
    visit.return_reason = None
    visit.return_sections = None

    db.session.add(HomeVisitSubmission(
        home_visit_id=visit.id, submitted_by_id=identity, submitted_at=now, snapshot=_snapshot(visit),
    ))

    for admin in User.query.filter(User.role.in_(("admin", "staff"))).all():
        notify(
            admin.id, "Home Visit Submitted", "Home visit submitted for review",
            f"{visit.assigned_to.name} submitted a home visit for {visit.elderly_member.full_name} for your review.",
            related_resource_type="home_visit", related_resource_id=visit.id,
        )
    db.session.commit()
    return jsonify(visit=visit.to_dict()), 200


@bp.post("/<int:visit_id>/approve")
@roles_required("admin", "staff")
def approve_visit(visit_id):
    """The only path to Completed — a volunteer can never set this status
    directly (see ASSIGNEE_SETTABLE_STATUSES in schemas.py), only
    admin/staff approving a submitted review. The workflow labels this
    state "Approved" everywhere in the UI; the stored value stays
    "Completed" on purpose so every existing dashboard/report/impact view
    that already counts completed home visits keeps working unchanged."""
    visit = get_or_404(HomeVisit, visit_id)
    if visit.status != "Under Review":
        return jsonify(error="Can only approve a visit that is Under Review"), 409

    now = utcnow()
    identity = int(get_jwt_identity())
    visit.status = "Completed"
    if visit.completed_at is None:
        visit.completed_at = now
    visit.reviewed_at = now
    visit.reviewed_by_id = identity

    submission = _latest_submission(visit.id)
    if submission is not None:
        submission.decision = "Approved"
        submission.decided_at = now
        submission.decided_by_id = identity

    if visit.assigned_to_id:
        notify(
            visit.assigned_to_id, "Home Visit Approved", "Your home visit was approved",
            f"Your home visit for {visit.elderly_member.full_name} has been reviewed and approved by KDCCE staff.",
            related_resource_type="home_visit", related_resource_id=visit.id,
        )
    db.session.commit()
    return jsonify(visit=visit.to_dict()), 200


@bp.post("/<int:visit_id>/return")
@roles_required("admin", "staff")
def return_visit(visit_id):
    visit = get_or_404(HomeVisit, visit_id)
    if visit.status != "Under Review":
        return jsonify(error="Can only return a visit that is Under Review"), 409

    payload = request.get_json(silent=True) or {}
    try:
        data = return_schema.load(payload)
    except ValidationError as err:
        return validation_error_response(err)

    now = utcnow()
    identity = int(get_jwt_identity())
    sections_json = json.dumps(data["sections"])
    visit.status = "Returned for Changes"
    visit.returned_at = now
    visit.return_reason = data["reason"]
    visit.return_sections = sections_json

    submission = _latest_submission(visit.id)
    if submission is not None:
        submission.decision = "Returned"
        submission.decided_at = now
        submission.decided_by_id = identity
        submission.return_reason = data["reason"]
        submission.return_sections = sections_json

    if visit.assigned_to_id:
        notify(
            visit.assigned_to_id, "Home Visit Returned", "Changes requested on your home visit",
            f"KDCCE staff requested changes on your home visit for {visit.elderly_member.full_name}: {data['reason'][:200]}",
            related_resource_type="home_visit", related_resource_id=visit.id,
        )
    db.session.commit()
    return jsonify(visit=visit.to_dict()), 200


@bp.get("/<int:visit_id>/submissions")
@jwt_required()
def list_visit_submissions(visit_id):
    """Full submission history — every submit-for-review cycle this visit
    has been through, most recent first. Same access rule as messages/
    photo: admin/staff always, the assigned verified volunteer only."""
    visit = get_or_404(HomeVisit, visit_id)
    role = get_jwt().get("role")
    identity = int(get_jwt_identity())
    if not _can_access_visit(visit, role, identity):
        return jsonify(error="Forbidden"), 403
    subs = HomeVisitSubmission.query.filter_by(home_visit_id=visit.id).order_by(HomeVisitSubmission.submitted_at.desc()).all()
    return jsonify(submissions=[s.to_dict() for s in subs]), 200


@bp.post("/<int:visit_id>/photo")
@jwt_required()
def upload_visit_photo(visit_id):
    visit = get_or_404(HomeVisit, visit_id)
    role = get_jwt().get("role")
    identity = int(get_jwt_identity())
    if not _can_access_visit(visit, role, identity):
        return jsonify(error="Forbidden"), 403
    if _locked_for_volunteer(visit, role):
        return jsonify(error=f"This visit is locked while it is '{visit.status}'."), 409

    try:
        attachment = save_photo("home_visit", visit.id, identity, request.files.get("photo"))
    except AttachmentError as err:
        return jsonify(error="Validation failed", details={"photo": [err.message]}), 400

    db.session.commit()
    return jsonify(attachment=attachment.to_dict()), 201


@bp.get("/<int:visit_id>/photo")
@jwt_required()
def get_visit_photo(visit_id):
    """Streams the file directly — there is no public static URL for this
    at any point; only this authenticated, authorized endpoint can ever
    read it."""
    visit = get_or_404(HomeVisit, visit_id)
    role = get_jwt().get("role")
    identity = int(get_jwt_identity())
    if not _can_access_visit(visit, role, identity):
        return jsonify(error="Forbidden"), 403

    attachment = get_attachment("home_visit", visit.id)
    if attachment is None:
        return jsonify(error="No photo for this visit"), 404
    return send_file(attachment_file_path(attachment), mimetype=attachment.mime_type, download_name=attachment.original_filename)


@bp.get("/<int:visit_id>/messages")
@jwt_required()
def list_visit_messages(visit_id):
    visit = get_or_404(HomeVisit, visit_id)
    role = get_jwt().get("role")
    identity = int(get_jwt_identity())
    if not _can_access_visit(visit, role, identity):
        return jsonify(error="Forbidden"), 403
    return jsonify(messages=[m.to_dict() for m in list_messages("home_visit", visit.id)]), 200


@bp.post("/<int:visit_id>/messages")
@jwt_required()
def create_visit_message(visit_id):
    visit = get_or_404(HomeVisit, visit_id)
    role = get_jwt().get("role")
    identity = int(get_jwt_identity())
    if not _can_access_visit(visit, role, identity):
        return jsonify(error="Forbidden"), 403

    payload = request.get_json(silent=True) or {}
    try:
        data = message_schema.load(payload)
    except ValidationError as err:
        return validation_error_response(err)

    message = send_message("home_visit", visit.id, identity, data["body"])
    # The volunteer messages the person who requested the visit; staff
    # messaging in either notifies the assigned volunteer.
    recipient_id = visit.requested_by_id if identity == visit.assigned_to_id else visit.assigned_to_id
    if recipient_id and recipient_id != identity:
        notify(
            recipient_id, "Assignment Message", "New message on a home visit",
            f"{message.sender.name}: {data['body'][:200]}",
            related_resource_type="home_visit", related_resource_id=visit.id,
        )
    db.session.commit()
    return jsonify(message=message.to_dict()), 201


@bp.post("/<int:visit_id>/review")
@roles_required("admin")
def review_visit(visit_id):
    """Admin-only, not the usual ("admin", "staff") pair used elsewhere in
    this module — rating a volunteer's completed work is reserved to
    admin specifically. Only allowed once the visit is Completed."""
    visit = get_or_404(HomeVisit, visit_id)
    if visit.status != "Completed":
        return jsonify(error="Can only review a visit once it is Completed"), 409

    payload = request.get_json(silent=True) or {}
    try:
        data = review_schema.load(payload)
    except ValidationError as err:
        return validation_error_response(err)

    review = submit_review("home_visit", visit.id, int(get_jwt_identity()), data["rating"], data.get("comment"))
    if visit.assigned_to_id:
        stars = "★" * data["rating"] + "☆" * (5 - data["rating"])
        notify(
            visit.assigned_to_id, "Assignment Reviewed", f"Your home visit was reviewed — {stars}",
            data.get("comment") or f"Rated {data['rating']}/5 stars.",
            related_resource_type="home_visit", related_resource_id=visit.id,
        )
    db.session.commit()
    return jsonify(review=review.to_dict()), 201


@bp.get("/<int:visit_id>/review")
@jwt_required()
def get_visit_review(visit_id):
    visit = get_or_404(HomeVisit, visit_id)
    role = get_jwt().get("role")
    identity = int(get_jwt_identity())
    if not _can_access_visit(visit, role, identity):
        return jsonify(error="Forbidden"), 403
    review = get_review("home_visit", visit.id)
    if review is None:
        return jsonify(error="No review for this visit"), 404
    return jsonify(review=review.to_dict()), 200


@bp.get("/<int:visit_id>/checklist")
@jwt_required()
def get_visit_checklist(visit_id):
    visit = get_or_404(HomeVisit, visit_id)
    role = get_jwt().get("role")
    identity = int(get_jwt_identity())
    if not _can_access_visit(visit, role, identity):
        return jsonify(error="Forbidden"), 403
    return jsonify(checklist=get_checklist("home_visit", visit.id)), 200


@bp.patch("/<int:visit_id>/checklist")
@jwt_required()
def update_visit_checklist(visit_id):
    visit = get_or_404(HomeVisit, visit_id)
    role = get_jwt().get("role")
    identity = int(get_jwt_identity())
    if not _can_access_visit(visit, role, identity):
        return jsonify(error="Forbidden"), 403
    if _locked_for_volunteer(visit, role):
        return jsonify(error=f"This visit is locked while it is '{visit.status}'."), 409

    payload = request.get_json(silent=True) or {}
    try:
        data = checklist_schema.load(payload)
    except ValidationError as err:
        return validation_error_response(err)

    try:
        set_checklist_item("home_visit", visit.id, data["item_key"], data["checked"], identity)
    except ChecklistError as err:
        return jsonify(error="Validation failed", details={"item_key": [err.message]}), 400

    db.session.commit()
    return jsonify(checklist=get_checklist("home_visit", visit.id)), 200


@bp.delete("/<int:visit_id>")
@roles_required("admin")
def delete_visit(visit_id):
    visit = get_or_404(HomeVisit, visit_id)
    db.session.delete(visit)
    db.session.commit()
    return "", 204
