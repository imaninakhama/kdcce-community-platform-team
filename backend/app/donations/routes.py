import uuid

from flask import Blueprint, jsonify, request
from marshmallow import ValidationError

from ..auth.decorators import roles_required
from ..extensions import db, limiter
from ..models import Donation, utcnow
from ..mpesa.service import MpesaError, initiate_stk_push, normalize_phone
from ..utils import PHONE_ERROR_MESSAGE, csv_response, get_or_404, validation_error_response
from .schemas import AdminDonationCreateSchema, DonationCreateSchema

bp = Blueprint("donations", __name__)

public_create_schema = DonationCreateSchema()
admin_create_schema = AdminDonationCreateSchema()

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
    """The public form only ever submits payment_method: "M-Pesa" — the
    schema enforces this (see PUBLIC_PAYMENT_METHODS in schemas.py) — so
    every donation created here goes through the real Daraja STK push and
    starts Pending, never optimistically Paid."""
    payload = request.get_json(silent=True) or {}
    try:
        data = public_create_schema.load(payload)
    except ValidationError as err:
        return validation_error_response(err)

    return _create_mpesa_donation(data)


def _create_mpesa_donation(data):
    """No other payment method here goes through a real gateway (see the
    note on Donation.status in models.py) — M-Pesa is the one exception,
    via Safaricom's Daraja STK push. The donation is created Pending, an
    STK push is sent to the donor's phone, and status only ever becomes
    Paid once Safaricom's own async callback confirms it
    (app/mpesa/routes.py) — never optimistically here."""
    phone = normalize_phone(data.get("donor_phone") or "")
    if not phone:
        return jsonify(
            error="Validation failed",
            details={"donor_phone": [PHONE_ERROR_MESSAGE]},
        ), 400

    donation = Donation(
        donation_type="Cash",
        donor_name=data["donor_name"],
        donor_email=data["donor_email"],
        donor_phone=data.get("donor_phone"),
        amount=data["amount"],
        currency=data["currency"],
        frequency=data["frequency"],
        campaign=data.get("campaign"),
        payment_method="M-Pesa",
        message=data.get("message"),
        status="Pending",
        txn_id=_generate_txn_id(),
        receipt_id=_generate_receipt_id(),
    )
    db.session.add(donation)
    db.session.flush()  # assigns donation.id/receipt_id before it's used as the STK account reference

    try:
        checkout_id = initiate_stk_push(
            phone=phone, amount=donation.amount, account_reference=donation.receipt_id,
            transaction_desc="KDCCE Donation",
        )
    except MpesaError as err:
        db.session.rollback()
        return jsonify(error=str(err)), 502

    donation.mpesa_checkout_request_id = checkout_id
    db.session.commit()
    return jsonify(donation=donation.to_dict()), 201


@bp.get("/api/donations/<int:donation_id>/status")
@limiter.limit("30 per minute")
def get_donation_status(donation_id):
    """Public and deliberately narrow — lets the donor's own browser poll
    for their M-Pesa result without exposing the admin-only full donation
    record (get_donation below) to an unauthenticated caller. Receipt-
    identifying fields are only ever included once status is Paid — an
    STK push having been sent is not a successful payment, and a Pending
    or Failed donation must never give the frontend anything it could
    use to render a receipt."""
    donation = get_or_404(Donation, donation_id)
    body = {"status": donation.status}
    if donation.status == "Paid":
        body["receipt_id"] = donation.receipt_id
        body["txn_id"] = donation.txn_id
        body["mpesa_receipt_number"] = donation.mpesa_receipt_number
    elif donation.status == "Failed":
        body["failure_reason"] = donation.mpesa_failure_reason
    return jsonify(**body), 200


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
    """Admins/staff can view a donation's payment details/status but
    cannot edit them — there is deliberately no PATCH here. A donation's
    status is only ever changed by the system itself (the M-Pesa callback
    confirming Paid/Failed), never by a direct admin edit."""
    donation = get_or_404(Donation, donation_id)
    return jsonify(donation=donation.to_dict()), 200
