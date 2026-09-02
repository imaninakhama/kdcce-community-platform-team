import base64
import re
from datetime import datetime

import requests
from flask import current_app

from ..email.service import send_email
from ..extensions import db
from ..models import Donation

TIMEOUT = 15  # seconds — Daraja sandbox is occasionally slow; fail fast rather than hang the request


class MpesaError(Exception):
    """Raised for anything that stops an STK push from being sent —
    missing config, a Daraja auth failure, or a rejected push request.
    Routes catch this and turn it into the app's standard error shape."""


def _base_url():
    return "https://api.safaricom.co.ke" if current_app.config["MPESA_ENV"] == "production" else "https://sandbox.safaricom.co.ke"


def _require_config():
    missing = [
        key for key in ("MPESA_CONSUMER_KEY", "MPESA_CONSUMER_SECRET", "MPESA_PASSKEY", "MPESA_CALLBACK_URL")
        if not current_app.config.get(key)
    ]
    if missing:
        raise MpesaError(
            "M-Pesa is not configured on this server (missing " + ", ".join(missing) + "). "
            "See backend/.env.example."
        )


def normalize_phone(raw):
    """Daraja requires the subscriber's number as 2547XXXXXXXX / 2541XXXXXXXX
    (country code, no leading 0 or +). Accepts the common local formats
    (0712345678, +254712345678, 254712345678, with or without spaces) and
    returns None if the result doesn't look like a real Safaricom-format
    number, rather than sending obvious garbage to Daraja."""
    digits = re.sub(r"\D", "", raw or "")
    if digits.startswith("0") and len(digits) == 10:
        digits = "254" + digits[1:]
    elif digits.startswith("254") and len(digits) == 12:
        pass
    elif len(digits) == 9 and digits[0] in ("7", "1"):
        digits = "254" + digits
    else:
        return None
    return digits if re.match(r"^254[71]\d{8}$", digits) else None


# Safaricom's own ResultDesc strings are inconsistent/technical ("DS
# timeout user cannot be reached") — map the common ones to something a
# donor can actually read. Falls back to a clean generic message for any
# code not listed here, never the raw Safaricom text.
FAILURE_REASONS = {
    1: "There were insufficient funds to complete this payment.",
    1001: "A payment is already being processed for this phone number. Please wait a moment and try again.",
    1025: "The payment request could not be sent. Please try again.",
    1032: "The payment request was cancelled.",
    1037: "No response was received in time. Please try again.",
    2001: "The PIN entered was incorrect.",
}
DEFAULT_FAILURE_REASON = "The payment could not be completed. Please try again."


def _friendly_failure_reason(result_code):
    return FAILURE_REASONS.get(result_code, DEFAULT_FAILURE_REASON)


def _get_access_token():
    _require_config()
    try:
        resp = requests.get(
            f"{_base_url()}/oauth/v1/generate",
            params={"grant_type": "client_credentials"},
            auth=(current_app.config["MPESA_CONSUMER_KEY"], current_app.config["MPESA_CONSUMER_SECRET"]),
            timeout=TIMEOUT,
        )
    except requests.RequestException as err:
        raise MpesaError(f"Could not reach Safaricom's API: {err}") from err
    if not resp.ok:
        raise MpesaError("Safaricom rejected the API credentials — check MPESA_CONSUMER_KEY/SECRET.")
    token = resp.json().get("access_token")
    if not token:
        raise MpesaError("Safaricom did not return an access token.")
    return token


def initiate_stk_push(phone, amount, account_reference, transaction_desc):
    """The single chokepoint every M-Pesa donation goes through: requests
    an access token, then triggers the actual STK ("Lipa na M-Pesa
    Online") push to the donor's phone. Returns Safaricom's
    CheckoutRequestID, which is the only thing tying the async callback
    back to this donation — callers must store it before returning to the
    client. Raises MpesaError on any failure; does not touch the database
    itself."""
    _require_config()
    token = _get_access_token()
    shortcode = current_app.config["MPESA_SHORTCODE"]
    passkey = current_app.config["MPESA_PASSKEY"]
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    password = base64.b64encode(f"{shortcode}{passkey}{timestamp}".encode()).decode()

    payload = {
        "BusinessShortCode": shortcode,
        "Password": password,
        "Timestamp": timestamp,
        "TransactionType": "CustomerPayBillOnline",
        "Amount": int(amount),  # Daraja sandbox rejects a decimal amount
        "PartyA": phone,
        "PartyB": shortcode,
        "PhoneNumber": phone,
        "CallBackURL": current_app.config["MPESA_CALLBACK_URL"],
        "AccountReference": account_reference[:12],  # Daraja truncates/rejects longer references
        "TransactionDesc": transaction_desc[:13],
    }
    try:
        resp = requests.post(
            f"{_base_url()}/mpesa/stkpush/v1/processrequest",
            json=payload,
            headers={"Authorization": f"Bearer {token}"},
            timeout=TIMEOUT,
        )
    except requests.RequestException as err:
        raise MpesaError(f"Could not reach Safaricom's API: {err}") from err

    body = resp.json() if resp.content else {}
    if not resp.ok or body.get("ResponseCode") != "0":
        raise MpesaError(body.get("errorMessage") or body.get("ResponseDescription") or "Safaricom rejected the payment request.")
    return body["CheckoutRequestID"]


def process_callback(payload):
    """Daraja calls this asynchronously, well after the original request
    that triggered the push has already returned to the donor — this is
    the only place a donation's status actually gets confirmed as Paid.
    Always returns normally (never raises) since Safaricom expects a 200
    acknowledgement regardless of what the callback contained; an
    unrecognized or already-resolved CheckoutRequestID is simply a no-op,
    not an error."""
    stk = (payload or {}).get("Body", {}).get("stkCallback", {})
    checkout_id = stk.get("CheckoutRequestID")
    if not checkout_id:
        return

    donation = Donation.query.filter_by(mpesa_checkout_request_id=checkout_id).first()
    if donation is None or donation.status != "Pending":
        return  # unknown reference, or already resolved by an earlier callback — nothing to do

    if stk.get("ResultCode") == 0:
        items = {item.get("Name"): item.get("Value") for item in stk.get("CallbackMetadata", {}).get("Item", [])}
        donation.status = "Paid"
        receipt_number = items.get("MpesaReceiptNumber")
        if receipt_number:
            donation.mpesa_receipt_number = str(receipt_number)
    else:
        donation.status = "Failed"
        donation.mpesa_failure_reason = _friendly_failure_reason(stk.get("ResultCode"))

    db.session.commit()

    if donation.status == "Paid":
        # Best-effort: a confirmation email is never a reason to fail this
        # callback — Daraja always gets its 200 regardless (see the note
        # on process_callback above), and app/email/service.py already
        # logs instead of sending when no provider is configured, so this
        # never raises in practice either way.
        try:
            _send_donation_receipt_email(donation)
        except Exception:
            current_app.logger.exception("Failed to send donation confirmation email for donation %s", donation.id)


def _send_donation_receipt_email(donation):
    frequency = "monthly" if donation.frequency == "monthly" else "one-time"
    campaign_line = f" to {donation.campaign}" if donation.campaign else ""
    body = (
        f"Hi {donation.donor_name},\n\n"
        f"Thank you for your {frequency} donation of {donation.currency} {donation.amount:,.2f}{campaign_line}. "
        "Your generosity helps KDCCE continue supporting older persons in Kibera.\n\n"
        f"Receipt number: {donation.receipt_id}\n"
        f"M-Pesa confirmation: {donation.mpesa_receipt_number or donation.txn_id}\n\n"
        "This receipt is also available any time from the donation confirmation screen.\n\n"
        "With gratitude,\n"
        "The KDCCE Team"
    )
    send_email(donation.donor_email, "Thank you for your donation to KDCCE", body)
