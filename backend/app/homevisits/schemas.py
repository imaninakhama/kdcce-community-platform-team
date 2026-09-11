from marshmallow import Schema, fields, validate

from ..models import HOME_VISIT_PRIORITIES, HOME_VISIT_RETURN_SECTIONS, HOME_VISIT_STATUSES

# What the assigned user may set their own visit's status to via PATCH.
# "Accepted" is deliberately excluded — that's POST .../accept, a separate,
# narrower action (see routes.py). "Completed" is deliberately excluded
# too, as of the review-gate workflow: it's now reachable only via
# POST .../approve (admin/staff), never self-declared by the volunteer.
# "Under Review" and "Returned for Changes" are excluded for the same
# reason — POST .../submit and .../return are the only paths there, since
# both must also create/update a HomeVisitSubmission row and notify the
# right people, which a bare status PATCH would silently skip.
ASSIGNEE_SETTABLE_STATUSES = ("Started", "In Progress", "Cancelled")

WELLBEING_OPTIONS = ("Good", "Fair", "Poor")


class HomeVisitCreateSchema(Schema):
    elderly_member_id = fields.Integer(required=True)
    reason = fields.String(required=True, validate=validate.Length(min=1, max=2000))
    instructions = fields.String(load_default=None, allow_none=True, validate=validate.Length(max=2000))
    priority = fields.String(allow_none=False, validate=validate.OneOf(HOME_VISIT_PRIORITIES))
    assigned_to_id = fields.Integer(load_default=None, allow_none=True)
    scheduled_at = fields.DateTime(load_default=None, allow_none=True)


class HomeVisitStaffUpdateSchema(Schema):
    """Full edit — admin/staff only. No load_default on status/
    follow_up_required/priority: a meaningful non-null default only makes
    sense at creation, not on every partial edit that omits the field."""

    elderly_member_id = fields.Integer()
    assigned_to_id = fields.Integer(allow_none=True)
    priority = fields.String(allow_none=False, validate=validate.OneOf(HOME_VISIT_PRIORITIES))
    status = fields.String(allow_none=False, validate=validate.OneOf(HOME_VISIT_STATUSES))
    reason = fields.String(validate=validate.Length(min=1, max=2000))
    instructions = fields.String(allow_none=True, validate=validate.Length(max=2000))
    scheduled_at = fields.DateTime(allow_none=True)
    observations = fields.String(allow_none=True, validate=validate.Length(max=4000))
    support_provided = fields.String(allow_none=True, validate=validate.Length(max=2000))
    follow_up_required = fields.Boolean()
    follow_up_notes = fields.String(allow_none=True, validate=validate.Length(max=2000))
    wellbeing = fields.String(allow_none=True, validate=validate.OneOf(WELLBEING_OPTIONS))
    mood = fields.String(allow_none=True, validate=validate.Length(max=60))
    blood_pressure_systolic = fields.Integer(allow_none=True, validate=validate.Range(min=0, max=300))
    blood_pressure_diastolic = fields.Integer(allow_none=True, validate=validate.Range(min=0, max=200))
    pulse_bpm = fields.Integer(allow_none=True, validate=validate.Range(min=0, max=300))
    temperature_celsius = fields.Float(allow_none=True, validate=validate.Range(min=25, max=45))
    weight_kg = fields.Float(allow_none=True, validate=validate.Range(min=0, max=400))
    physical_activity = fields.String(allow_none=True, validate=validate.Length(max=1000))
    basic_needs_confirmed = fields.Boolean()
    concerns_discussed = fields.String(allow_none=True, validate=validate.Length(max=2000))


class HomeVisitAssigneeUpdateSchema(Schema):
    """What the assigned staff member or verified volunteer may record on
    their own visit — the outcome, not the assignment itself. routes.py
    additionally rejects any use of this while the visit is locked
    (Under Review / Completed)."""

    status = fields.String(allow_none=False, validate=validate.OneOf(ASSIGNEE_SETTABLE_STATUSES))
    observations = fields.String(allow_none=True, validate=validate.Length(max=4000))
    support_provided = fields.String(allow_none=True, validate=validate.Length(max=2000))
    follow_up_required = fields.Boolean()
    follow_up_notes = fields.String(allow_none=True, validate=validate.Length(max=2000))
    wellbeing = fields.String(allow_none=True, validate=validate.OneOf(WELLBEING_OPTIONS))
    mood = fields.String(allow_none=True, validate=validate.Length(max=60))
    blood_pressure_systolic = fields.Integer(allow_none=True, validate=validate.Range(min=0, max=300))
    blood_pressure_diastolic = fields.Integer(allow_none=True, validate=validate.Range(min=0, max=200))
    pulse_bpm = fields.Integer(allow_none=True, validate=validate.Range(min=0, max=300))
    temperature_celsius = fields.Float(allow_none=True, validate=validate.Range(min=25, max=45))
    weight_kg = fields.Float(allow_none=True, validate=validate.Range(min=0, max=400))
    physical_activity = fields.String(allow_none=True, validate=validate.Length(max=1000))
    basic_needs_confirmed = fields.Boolean()
    concerns_discussed = fields.String(allow_none=True, validate=validate.Length(max=2000))


class HomeVisitReturnSchema(Schema):
    reason = fields.String(required=True, validate=validate.Length(min=1, max=2000))
    sections = fields.List(fields.String(validate=validate.OneOf(HOME_VISIT_RETURN_SECTIONS)), load_default=list)
