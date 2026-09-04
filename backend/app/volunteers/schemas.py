from datetime import date

from marshmallow import Schema, fields, validate, ValidationError

from ..models import VOLUNTEER_STATUSES
from ..utils import validate_kenyan_phone


def _not_under_18_or_future(value):
    today = date.today()
    if value > today:
        raise ValidationError("Date of birth cannot be in the future.")
    age = today.year - value.year - ((today.month, today.day) < (value.month, value.day))
    if age < 18:
        raise ValidationError("You must be at least 18 years old to apply.")


class VolunteerSelfUpdateSchema(Schema):
    """What a volunteer may change on their own profile/application — never
    status, reviewed_by, reviewed_at, or rejection_reason. Used both for
    the initial application (immediately after registration) and for later
    self-service edits — the same fields are editable either way."""

    phone = fields.String(allow_none=True, validate=validate_kenyan_phone)
    skills = fields.String(allow_none=True, validate=validate.Length(max=1000))
    availability = fields.String(allow_none=True, validate=validate.Length(max=1000))
    areas_of_interest = fields.String(allow_none=True, validate=validate.Length(max=1000))
    experience = fields.String(allow_none=True, validate=validate.Length(max=2000))
    motivation = fields.String(allow_none=True, validate=validate.Length(max=2000))
    bio = fields.String(allow_none=True, validate=validate.Length(max=2000))
    date_of_birth = fields.Date(allow_none=True, validate=_not_under_18_or_future)
    county = fields.String(allow_none=True, validate=validate.Length(max=80))
    min_hours_available = fields.Integer(allow_none=True, validate=validate.Range(min=1))
    emergency_contact_name = fields.String(allow_none=True, validate=validate.Length(max=120))
    emergency_contact_phone = fields.String(allow_none=True, validate=validate_kenyan_phone)
    # These three consent flags may only ever be set to True by a
    # self-update — validate.Equal(True) rejects an explicit False in the
    # payload (a crafted request can't "unagree" someone), while omitting
    # the field entirely (this schema is always loaded with partial=True)
    # leaves the existing value untouched.
    code_of_conduct_agreed = fields.Boolean(allow_none=False, validate=validate.Equal(True))
    privacy_consent_agreed = fields.Boolean(allow_none=False, validate=validate.Equal(True))
    accuracy_declaration_agreed = fields.Boolean(allow_none=False, validate=validate.Equal(True))


class VolunteerStaffUpdateSchema(VolunteerSelfUpdateSchema):
    """Staff/admin can additionally verify or reject a volunteer, and
    record why on a rejection. rejection_reason is accepted regardless of
    which way status is set — the route clears it on any non-Rejected
    status so a stale reason from a previous rejection can't linger past
    a later reversal."""

    status = fields.String(allow_none=False, validate=validate.OneOf(VOLUNTEER_STATUSES))
    rejection_reason = fields.String(allow_none=True, validate=validate.Length(max=2000))
