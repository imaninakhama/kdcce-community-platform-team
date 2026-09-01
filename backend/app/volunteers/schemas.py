from datetime import date as _date

from marshmallow import Schema, ValidationError, fields, validate, validates_schema

from ..models import VOLUNTEER_HOURS_CATEGORIES, VOLUNTEER_STATUSES


class VolunteerSelfUpdateSchema(Schema):
    """What a volunteer may change on their own profile/application — never
    status, reviewed_by, reviewed_at, or rejection_reason. Used both for
    the initial application (immediately after registration) and for later
    self-service edits — the same fields are editable either way."""

    phone = fields.String(allow_none=True, validate=validate.Length(max=40))
    skills = fields.String(allow_none=True, validate=validate.Length(max=1000))
    availability = fields.String(allow_none=True, validate=validate.Length(max=1000))
    areas_of_interest = fields.String(allow_none=True, validate=validate.Length(max=1000))
    experience = fields.String(allow_none=True, validate=validate.Length(max=2000))
    motivation = fields.String(allow_none=True, validate=validate.Length(max=2000))
    bio = fields.String(allow_none=True, validate=validate.Length(max=2000))


class VolunteerStaffUpdateSchema(VolunteerSelfUpdateSchema):
    """Staff/admin can additionally verify or reject a volunteer, and
    record why on a rejection. rejection_reason is accepted regardless of
    which way status is set — the route clears it on any non-Rejected
    status so a stale reason from a previous rejection can't linger past
    a later reversal."""

    status = fields.String(allow_none=False, validate=validate.OneOf(VOLUNTEER_STATUSES))
    rejection_reason = fields.String(allow_none=True, validate=validate.Length(max=2000))


class ManualHoursCreateSchema(Schema):
    date = fields.Date(required=True)
    duration_minutes = fields.Integer(required=True, validate=validate.Range(min=1, max=24 * 60))
    category = fields.String(load_default="Other", validate=validate.OneOf(VOLUNTEER_HOURS_CATEGORIES))
    description = fields.String(load_default=None, allow_none=True, validate=validate.Length(max=1000))

    @validates_schema
    def validate_not_future(self, data, **kwargs):
        if data["date"] > _date.today():
            raise ValidationError({"date": ["Cannot log hours for a future date"]})


class ManualHoursReviewSchema(Schema):
    """Admin/staff only — approve or reject a submitted entry. Never lets
    the submitter's own fields (date/duration/category/description) be
    edited here; a wrong entry is rejected and resubmitted, not silently
    rewritten by someone else."""

    status = fields.String(required=True, validate=validate.OneOf(("Approved", "Rejected")))
    rejection_reason = fields.String(load_default=None, allow_none=True, validate=validate.Length(max=2000))


class RecognitionCreateSchema(Schema):
    achievement_id = fields.Integer(required=True)
    notes = fields.String(load_default=None, allow_none=True, validate=validate.Length(max=1000))
