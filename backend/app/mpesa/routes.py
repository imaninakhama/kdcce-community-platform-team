from flask import Blueprint, jsonify, request

from .service import process_callback

bp = Blueprint("mpesa", __name__, url_prefix="/api/mpesa")


@bp.post("/callback")
def callback():
    """Public by necessity — Safaricom's own servers call this directly,
    with no way for them to carry our JWT. Nothing here is trusted as an
    authenticated action on a user's behalf; it only ever flips a specific
    donation (matched by Safaricom's own CheckoutRequestID) from Pending to
    Paid/Failed. Always acknowledges 200 with ResultCode 0, regardless of
    what the payload contained — Daraja retries a callback that doesn't
    get this exact acknowledgement, which would just resend the same
    (already-handled) result forever."""
    process_callback(request.get_json(silent=True) or {})
    return jsonify(ResultCode=0, ResultDesc="Accepted"), 200
