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


def test_pending_status_never_includes_receipt_fields(client, monkeypatch):
    # An STK push having been sent is not a successful payment — the
    # frontend must have nothing it could use to render a receipt while
    # still waiting on Safaricom's callback.
    monkeypatch.setattr("app.donations.routes.initiate_stk_push", lambda **kwargs: "ws_CO_pending_case")
    donation = client.post("/api/donations", json=VALID_MPESA_DONATION).get_json()["donation"]

    body = client.get(f"/api/donations/{donation['id']}/status").get_json()
    assert "receipt_id" not in body
    assert "txn_id" not in body
    assert "mpesa_receipt_number" not in body


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
    assert status["receipt_id"] == donation["receipt_id"]
    assert status["txn_id"] == donation["txn_id"]


def test_callback_sends_donation_confirmation_email_on_success(client, monkeypatch):
    monkeypatch.setattr("app.donations.routes.initiate_stk_push", lambda **kwargs: "ws_CO_email_case")
    sent = {}
    monkeypatch.setattr("app.mpesa.service.send_email", lambda to_email, subject, body: sent.update(to=to_email, subject=subject, body=body) or True)
    donation = client.post("/api/donations", json=VALID_MPESA_DONATION).get_json()["donation"]

    callback_payload = {
        "Body": {"stkCallback": {
            "CheckoutRequestID": "ws_CO_email_case", "ResultCode": 0,
            "CallbackMetadata": {"Item": [{"Name": "MpesaReceiptNumber", "Value": "QWE123RTY"}]},
        }}
    }
    resp = client.post("/api/mpesa/callback", json=callback_payload)
    assert resp.status_code == 200

    assert sent["to"] == VALID_MPESA_DONATION["donor_email"]
    assert "Thank you" in sent["subject"]
    assert donation["receipt_id"] in sent["body"]
    assert "QWE123RTY" in sent["body"]


def test_callback_does_not_send_email_on_failed_payment(client, monkeypatch):
    monkeypatch.setattr("app.donations.routes.initiate_stk_push", lambda **kwargs: "ws_CO_no_email_case")
    calls = []
    monkeypatch.setattr("app.mpesa.service.send_email", lambda *a, **kw: calls.append(1) or True)
    client.post("/api/donations", json=VALID_MPESA_DONATION)

    callback_payload = {"Body": {"stkCallback": {"CheckoutRequestID": "ws_CO_no_email_case", "ResultCode": 1032, "ResultDesc": "Request cancelled by user."}}}
    client.post("/api/mpesa/callback", json=callback_payload)
    assert calls == []


def test_callback_email_failure_does_not_break_the_callback(client, monkeypatch):
    """Daraja must always get its 200 acknowledgement, and the donation
    must still end up Paid, even if sending the confirmation email
    blows up (e.g. the mail provider is down)."""
    monkeypatch.setattr("app.donations.routes.initiate_stk_push", lambda **kwargs: "ws_CO_broken_email")

    def _raise(*a, **kw):
        raise RuntimeError("mail provider is down")
    monkeypatch.setattr("app.mpesa.service.send_email", _raise)
    donation = client.post("/api/donations", json=VALID_MPESA_DONATION).get_json()["donation"]

    callback_payload = {"Body": {"stkCallback": {"CheckoutRequestID": "ws_CO_broken_email", "ResultCode": 0, "CallbackMetadata": {"Item": []}}}}
    resp = client.post("/api/mpesa/callback", json=callback_payload)
    assert resp.status_code == 200

    status = client.get(f"/api/donations/{donation['id']}/status").get_json()
    assert status["status"] == "Paid"


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
    assert status["failure_reason"] == "The payment request was cancelled."
    assert "receipt_id" not in status
    assert "txn_id" not in status


def test_callback_failure_reason_for_insufficient_funds(client, monkeypatch):
    monkeypatch.setattr("app.donations.routes.initiate_stk_push", lambda **kwargs: "ws_CO_insufficient_funds")
    donation = client.post("/api/donations", json=VALID_MPESA_DONATION).get_json()["donation"]

    client.post("/api/mpesa/callback", json={
        "Body": {"stkCallback": {"CheckoutRequestID": "ws_CO_insufficient_funds", "ResultCode": 1, "ResultDesc": "The balance is insufficient for the transaction."}}
    })
    status = client.get(f"/api/donations/{donation['id']}/status").get_json()
    assert status["failure_reason"] == "There were insufficient funds to complete this payment."


def test_callback_failure_reason_for_timeout(client, monkeypatch):
    monkeypatch.setattr("app.donations.routes.initiate_stk_push", lambda **kwargs: "ws_CO_timeout_case")
    donation = client.post("/api/donations", json=VALID_MPESA_DONATION).get_json()["donation"]

    client.post("/api/mpesa/callback", json={
        "Body": {"stkCallback": {"CheckoutRequestID": "ws_CO_timeout_case", "ResultCode": 1037, "ResultDesc": "DS timeout user cannot be reached"}}
    })
    status = client.get(f"/api/donations/{donation['id']}/status").get_json()
    assert status["failure_reason"] == "No response was received in time. Please try again."


def test_callback_failure_reason_falls_back_for_unknown_code(client, monkeypatch):
    monkeypatch.setattr("app.donations.routes.initiate_stk_push", lambda **kwargs: "ws_CO_unknown_case")
    donation = client.post("/api/donations", json=VALID_MPESA_DONATION).get_json()["donation"]

    client.post("/api/mpesa/callback", json={
        "Body": {"stkCallback": {"CheckoutRequestID": "ws_CO_unknown_case", "ResultCode": 424242, "ResultDesc": "Some obscure internal Safaricom code."}}
    })
    status = client.get(f"/api/donations/{donation['id']}/status").get_json()
    assert status["failure_reason"] == "The payment could not be completed. Please try again."


def test_callback_with_unknown_checkout_id_is_a_harmless_noop(client):
    resp = client.post("/api/mpesa/callback", json={
        "Body": {"stkCallback": {"CheckoutRequestID": "does-not-exist", "ResultCode": 0}}
    })
    assert resp.status_code == 200


def test_non_mpesa_payment_method_is_rejected_on_public_form(client):
    # The public donation form only has a real gateway for M-Pesa — a
    # payment_method it can't actually process must never be silently
    # accepted (that would let a donation be marked Paid without anyone
    # ever charging the donor). Card (Stripe)/PayPal remain valid for
    # staff logging an already-completed offline donation (see
    # test_donations.py::test_staff_can_log_a_cash_donation_reported_via_paypal).
    resp = client.post("/api/donations", json={
        "donor_name": "Amina K.", "donor_email": "amina@example.com",
        "amount": 500, "frequency": "one-time", "payment_method": "Card (Stripe)",
    })
    assert resp.status_code == 400
    assert "payment_method" in resp.get_json()["details"]
