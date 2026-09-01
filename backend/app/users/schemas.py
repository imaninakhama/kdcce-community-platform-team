from marshmallow import Schema, fields, validate

from ..models import USER_ROLES


class UserCreateSchema(Schema):
    name = fields.String(required=True, validate=validate.Length(min=1, max=120))
    email = fields.Email(required=True)
    password = fields.String(required=True, validate=validate.Length(min=8, max=128))
    role = fields.String(required=True, validate=validate.OneOf(USER_ROLES))


class UserUpdateSchema(Schema):
    name = fields.String(validate=validate.Length(min=1, max=120))
    email = fields.Email()


class RoleChangeSchema(Schema):
    role = fields.String(required=True, validate=validate.OneOf(USER_ROLES))


class StatusChangeSchema(Schema):
    active = fields.Boolean(required=True)
