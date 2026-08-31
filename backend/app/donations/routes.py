import uuid

from flask import Blueprint, jsonify, request
from marshmallow import ValidationError

from ..auth.decorators import roles_required
from ..extensions import db, limiter
from ..models import Donation, utcnow
from ..utils import csv_response, get_or_404, validation_error_response
from .schemas import AdminDonationCreateSchema, DonationCreateSchema, DonationUpdateSchema

bp = Blueprint("donations", __name__)

public_create_schema = DonationCreateSchema()
admin_create_schema = AdminDonationCreateSchema()
update_schema = DonationUpdateSchema()

CSV_HEADER = [
    "Donor", "Email", "Amount", "Currency", "Frequency", "Campaign", "Payment Method",
    "Status", "Transaction ID", "Receipt ID", "Date", "Type", "Item Description", "Quantity", "Unit",
]


def _generate_receipt_id():
    year = utcnow().year
    count = Donation.query.filter(Donation.receipt_id.like(f"KDCCE-{year}-%")).count()
    return f"KDCCE-{year}-{str(count + 1).zfill(6)}"


def _generate_txn_id():
    return f"TXN-{uuid.uuid4().hex[:12].upper()}"


@bp.post("/api/donations")
@limiter.limit("10 per minute")
def create_public_donation():
    payload = request.get_json(silent=True) or {}
    try:
        data = public_create_schema.load(payload)
    except ValidationError as err:
        return validation_error_response(err)

    donation = Donation(
        donation_type="Cash",
        donor_name=data["donor_name"],
        donor_email=data["donor_email"],
        donor_phone=data.get("donor_phone"),
        amount=data["amount"],
        currency=data["currency"],
        frequency=data["frequency"],
        campaign=data.get("campaign"),
        payment_method=data.get("payment_method"),
        message=data.get("message"),
        status="Paid",
        txn_id=_generate_txn_id(),
        receipt_id=_generate_receipt_id(),
    )
    db.session.add(donation)
    db.session.commit()
    return jsonify(donation=donation.to_dict()), 201


@bp.post("/api/admin/donations")
@roles_required("admin", "staff")
def create_admin_donation():
    payload = request.get_json(silent=True) or {}
    try:
        data = admin_create_schema.load(payload)
    except ValidationError as err:
        return validation_error_response(err)

    donation_type = data["donation_type"]
    donation = Donation(
        donation_type=donation_type,
        donor_name=data["donor_name"],
        donor_email=data.get("donor_email"),
        donor_phone=data.get("donor_phone"),
        amount=data.get("amount"),
        currency=data["currency"],
        payment_method=data.get("payment_method") if donation_type == "Cash" else None,
        campaign=data.get("campaign"),
        item_description=data.get("item_description"),
        quantity=data.get("quantity"),
        unit=data.get("unit"),
        message=data.get("message"),
        status="Paid" if donation_type == "Cash" else "Received",
        frequency="one-time",
        txn_id=_generate_txn_id(),
        receipt_id=_generate_receipt_id(),
    )
    db.session.add(donation)
    db.session.commit()
    return jsonify(donation=donation.to_dict()), 201


@bp.get("/api/donations")
@roles_required("admin", "staff")
def list_donations():
    query = Donation.query
    donation_type = request.args.get("donation_type")
    if donation_type:
        query = query.filter(Donation.donation_type == donation_type)
    donations = query.order_by(Donation.created_at.desc()).all()
    return jsonify(donations=[d.to_dict() for d in donations]), 200


@bp.get("/api/donations/export.csv")
@roles_required("admin", "staff")
def export_donations_csv():
    donations = Donation.query.order_by(Donation.created_at.desc()).all()
    rows = [
        [
            d.donor_name, d.donor_email or "", d.amount if d.amount is not None else "", d.currency,
            d.frequency, d.campaign or "", d.payment_method or "", d.status, d.txn_id, d.receipt_id,
            d.created_at.isoformat(), d.donation_type, d.item_description or "",
            d.quantity if d.quantity is not None else "", d.unit or "",
        ]
        for d in donations
    ]
    return csv_response("donations.csv", CSV_HEADER, rows)


@bp.get("/api/donations/<int:donation_id>")
@roles_required("admin", "staff")
def get_donation(donation_id):
    donation = get_or_404(Donation, donation_id)
    return jsonify(donation=donation.to_dict()), 200


@bp.patch("/api/donations/<int:donation_id>")
@roles_required("admin", "staff")
def update_donation(donation_id):
    donation = get_or_404(Donation, donation_id)
    payload = request.get_json(silent=True) or {}
    try:
        data = update_schema.load(payload, partial=True)
    except ValidationError as err:
        return validation_error_response(err)

    for field, value in data.items():
        setattr(donation, field, value)
    db.session.commit()
    return jsonify(donation=donation.to_dict()), 200
