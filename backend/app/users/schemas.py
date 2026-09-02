from marshmallow import Schema, fields, validate

# Staff accounts are content-only and must never grant themselves or
# anyone else broader access — this endpoint (and the roles_required
# check guarding it in routes.py) only ever creates/lists/removes an
# "admin" or "staff" account, never "volunteer" (that's public
# self-registration, see app/auth/routes.py::register).
MANAGEABLE_ROLES = ("admin", "staff")


class AdminUserCreateSchema(Schema):
    name = fields.String(required=True, validate=validate.Length(min=1, max=120))
    email = fields.Email(required=True)
    password = fields.String(required=True, validate=validate.Length(min=8))
    role = fields.String(required=True, validate=validate.OneOf(MANAGEABLE_ROLES))
