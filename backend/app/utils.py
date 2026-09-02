import csv
import io
from datetime import date

from flask import abort, jsonify, make_response
from flask_jwt_extended import create_access_token, create_refresh_token

from .extensions import db


def issue_tokens(user):
    """The single place that mints an access/refresh token pair for a
    user — used by every flow that ends in a real session (login,
    register, and volunteer-invitation acceptance), so the JWT claims
    shape can never drift between them."""
    claims = {"role": user.role}
    return (
        create_access_token(identity=str(user.id), additional_claims=claims),
        create_refresh_token(identity=str(user.id), additional_claims=claims),
    )


def get_or_404(model, object_id):
    obj = db.session.get(model, object_id)
    if obj is None:
        abort(404, description=f"{model.__name__} not found")
    return obj


def validation_error_response(err):
    return jsonify(error="Validation failed", details=err.messages), 400


class ReportFilterError(Exception):
    def __init__(self, field, message):
        self.field = field
        self.message = message
        super().__init__(message)


def parse_date_range(args):
    def _parse(key):
        raw = args.get(key)
        if not raw:
            return None
        try:
            return date.fromisoformat(raw)
        except ValueError:
            raise ReportFilterError(key, "Must be a valid date in YYYY-MM-DD format")

    date_from, date_to = _parse("date_from"), _parse("date_to")
    if date_from is not None and date_to is not None and date_to < date_from:
        raise ReportFilterError("date_to", "Must not be before date_from")
    return date_from, date_to


def csv_response(filename, header_row, data_rows):
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(header_row)
    writer.writerows(data_rows)

    response = make_response(buffer.getvalue())
    response.headers["Content-Type"] = "text/csv"
    response.headers["Content-Disposition"] = f"attachment; filename={filename}"
    return response
