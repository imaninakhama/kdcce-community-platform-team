from app.mpesa.service import normalize_phone

VALID_MPESA_DONATION = {
    "donor_name": "Amina K.",
    "donor_email": "amina@example.com",
    "donor_phone": "0712345678",
    "amount": 500,
    "frequency": "one-time",
    "payment_method": "M-Pesa",
}


def test_normalize_phone_local_format():
    assert normalize_phone("0712345678") == "254712345678"


def test_normalize_phone_already_254():
    assert normalize_phone("254712345678") == "254712345678"


def test_normalize_phone_plus_254():
    assert normalize_phone("+254 712 345 678") == "254712345678"


def test_normalize_phone_rejects_garbage():
    assert normalize_phone("not a phone number") is None
    assert normalize_phone("12345") is None
    assert normalize_phone("") is None


def test_mpesa_donation_rejects_missing_phone(client):
    payload = {k: v for k, v in VALID_MPESA_DONATION.items() if k != "donor_phone"}
    resp = client.post("/api/donations", json=payload)
    assert resp.status_code == 400
    assert "donor_phone" in resp.get_json()["details"]


def test_mpesa_donation_rejects_invalid_phone(client):
    resp = client.post("/api/donations", json={**VALID_MPESA_DONATION, "donor_phone": "not-a-number"})
    assert resp.status_code == 400
    assert "donor_phone" in resp.get_json()["details"]


def test_mpesa_donation_without_config_returns_502(client):
    # TestingConfig never sets MPESA_CONSUMER_KEY/SECRET/CALLBACK_URL, so
    # initiate_stk_push must fail fast with a clear error rather than
    # attempting a real network call.
    resp = client.post("/api/donations", json=VALID_MPESA_DONATION)
    assert resp.status_code == 502
    assert "not configured" in resp.get_json()["error"]


def test_mpesa_donation_creates_pending_row_on_successful_push(client, monkeypatch):
    monkeypatch.setattr("app.donations.routes.initiate_stk_push", lambda **kwargs: "ws_CO_test_12345")
    resp = client.post("/api/donations", json=VALID_MPESA_DONATION)
    assert resp.status_code == 201
    donation = resp.get_json()["donation"]
    assert donation["status"] == "Pending"
    assert donation["payment_method"] == "M-Pesa"
    assert donation["mpesa_receipt_number"] is None


def test_mpesa_donation_push_failure_returns_502_and_rolls_back(client, monkeypatch):
    from app.mpesa.service import MpesaError

    def _raise(**kwargs):
        raise MpesaError("Safaricom rejected the payment request.")

    monkeypatch.setattr("app.donations.routes.initiate_stk_push", _raise)
    resp = client.post("/api/donations", json=VALID_MPESA_DONATION)
    assert resp.status_code == 502

    # The donation row must not be left behind half-created.
    from app.extensions import db
    from app.models import Donation
    assert db.session.query(Donation).count() == 0


def test_donation_status_endpoint_is_public(client, monkeypatch):
    monkeypatch.setattr("app.donations.routes.initiate_stk_push", lambda **kwargs: "ws_CO_test_99999")
    donation = client.post("/api/donations", json=VALID_MPESA_DONATION).get_json()["donation"]

    resp = client.get(f"/api/donations/{donation['id']}/status")
    assert resp.status_code == 200
    body = resp.get_json()
    assert body["status"] == "Pending"
    assert body["receipt_id"] == donation["receipt_id"]


def test_callback_marks_donation_paid_on_success(client, monkeypatch, app):
    monkeypatch.setattr("app.donations.routes.initiate_stk_push", lambda **kwargs: "ws_CO_paid_case")
    donation = client.post("/api/donations", json=VALID_MPESA_DONATION).get_json()["donation"]

    callback_payload = {
        "Body": {
            "stkCallback": {
                "CheckoutRequestID": "ws_CO_paid_case",
                "ResultCode": 0,
                "ResultDesc": "The service request is processed successfully.",
                "CallbackMetadata": {
                    "Item": [
                        {"Name": "Amount", "Value": 500.0},
                        {"Name": "MpesaReceiptNumber", "Value": "NLJ7RT61SV"},
                        {"Name": "TransactionDate", "Value": 20260831103000},
                        {"Name": "PhoneNumber", "Value": 254712345678},
                    ]
                },
            }
        }
    }
    resp = client.post("/api/mpesa/callback", json=callback_payload)
    assert resp.status_code == 200
    assert resp.get_json()["ResultCode"] == 0

    status = client.get(f"/api/donations/{donation['id']}/status").get_json()
    assert status["status"] == "Paid"
    assert status["mpesa_receipt_number"] == "NLJ7RT61SV"


def test_callback_marks_donation_failed_on_cancellation(client, monkeypatch):
    monkeypatch.setattr("app.donations.routes.initiate_stk_push", lambda **kwargs: "ws_CO_cancelled_case")
    donation = client.post("/api/donations", json=VALID_MPESA_DONATION).get_json()["donation"]

    callback_payload = {
        "Body": {
            "stkCallback": {
                "CheckoutRequestID": "ws_CO_cancelled_case",
                "ResultCode": 1032,
                "ResultDesc": "Request cancelled by user.",
            }
        }
    }
    resp = client.post("/api/mpesa/callback", json=callback_payload)
    assert resp.status_code == 200

    status = client.get(f"/api/donations/{donation['id']}/status").get_json()
    assert status["status"] == "Failed"


def test_callback_with_unknown_checkout_id_is_a_harmless_noop(client):
    resp = client.post("/api/mpesa/callback", json={
        "Body": {"stkCallback": {"CheckoutRequestID": "does-not-exist", "ResultCode": 0}}
    })
    assert resp.status_code == 200


def test_non_mpesa_donation_still_paid_immediately(client):
    resp = client.post("/api/donations", json={
        "donor_name": "Amina K.", "donor_email": "amina@example.com",
        "amount": 500, "frequency": "one-time", "payment_method": "Card (Stripe)",
    })
    assert resp.status_code == 201
    assert resp.get_json()["donation"]["status"] == "Paid"
