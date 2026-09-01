# Donations

`backend/app/donations/` — public donation form (Cash only) + staff-logged
donations of any type + admin/staff management. `txn_id`/`receipt_id` are
always server-generated, for every donation type.

**M-Pesa is the one real payment gateway integrated** (Safaricom Daraja,
sandbox by default — see `backend/app/mpesa/` and `backend/.env.example`
for setup). Every other `payment_method`/`donation_type` combination still
has no real gateway behind it: `status` there is just an internal workflow
label, set immediately and never independently verified.

`donation_type` is `Cash | Food | Equipment`. Cash uses `amount` as the
payment amount and defaults `status` to `Paid`; Food/Equipment use
`item_description`/`quantity`/`unit` and default `status` to `Received`
(`amount` becomes an optional *estimated value* for these, not a payment).
`campaign` doubles as "purpose/category" for every type. `donor_email` is
required for Cash (by schema, not by the column) but optional for
Food/Equipment — an in-person in-kind donor may not leave contact info.

Donation object:
```json
{
  "id": 1, "donation_type": "Cash", "donor_name": "...", "donor_email": "...", "donor_phone": "...",
  "amount": 500.0, "currency": "KES", "frequency": "one-time",
  "campaign": null, "payment_method": "M-Pesa",
  "item_description": null, "quantity": null, "unit": null,
  "status": "Paid", "txn_id": "TXN-A1B2C3D4E5F6", "receipt_id": "KDCCE-2026-000001",
  "mpesa_receipt_number": "NLJ7RT61SV",
  "message": null, "created_at": "...", "updated_at": "..."
}
```
`mpesa_receipt_number` is Safaricom's own receipt code — `null` until an
M-Pesa payment is actually confirmed (or for any non-M-Pesa donation).
Kept separate from `txn_id`/`receipt_id`, which stay this app's own
server-generated identifiers regardless of payment method.

A Food/Equipment row looks the same shape with `amount`/`payment_method`
null (unless an estimated value was given) and `item_description`/
`quantity`/`unit` filled in instead.

## POST /api/donations

Still Cash only; there is no public way to create a Food/Equipment
donation.

- **Auth:** none (public donor form).
- **Request:**
  ```json
  {
    "donor_name": "string, required, max 120",
    "donor_email": "email, required",
    "donor_phone": "string, required for M-Pesa (a valid Safaricom number), optional otherwise, max 40",
    "amount": "number > 0, required",
    "currency": "KES (only allowed value), optional, default KES",
    "frequency": "one-time | monthly, required",
    "campaign": "string, optional, max 120",
    "payment_method": "M-Pesa | Card (Stripe) | PayPal, optional",
    "message": "string, optional, max 2000"
  }
  ```
  `status`, `donation_type`, `txn_id`, `receipt_id` are rejected/ignored if sent — always `Cash`/server-generated.

  **`payment_method: "M-Pesa"` behaves differently from every other
  method**: instead of an immediate `Paid` response, this triggers a real
  Safaricom STK push to `donor_phone` and the donation is created with
  `status: "Pending"`. The response still comes back `201` right away
  (the push has been *sent*, not completed) — the frontend must poll
  `GET /api/donations/{id}/status` (below) until `status` becomes `Paid`
  or `Failed`. Every other `payment_method` is unchanged: an immediate
  `201` with `status: "Paid"`.
- **Response `201`:** `{ "donation": { ... } }`
- **Errors:** `400` validation (includes an invalid/missing phone for
  M-Pesa); `502` if M-Pesa isn't configured on this server, or Safaricom's
  API rejects/is unreachable for the push request itself — this is about
  *sending* the push, not the donor's PIN entry, which resolves later via
  the callback instead.

## GET /api/donations/{id}/status

Public, deliberately narrow — built for the donation form to poll while
waiting on an M-Pesa push, without exposing the full admin-only donation
record (`GET /api/donations/{id}` below) to an unauthenticated caller.

- **Auth:** none.
- **Response `200`:** `{ "status": "...", "receipt_id": "...", "txn_id": "...", "mpesa_receipt_number": "..." }`
- **Errors:** `404`.

## POST /api/mpesa/callback

Safaricom's own servers call this directly once an STK push resolves —
never called by the frontend. Must be a **publicly reachable URL**
(`MPESA_CALLBACK_URL` in `.env`); `localhost` doesn't work, use a tunnel
(e.g. `ngrok`) in dev. Matches the donation by Safaricom's
`CheckoutRequestID`, stored when the push was sent. Flips a `Pending`
donation to `Paid` (recording `mpesa_receipt_number`) or `Failed`; an
unrecognized `CheckoutRequestID`, or one already resolved, is a no-op.

- **Auth:** none (Safaricom can't carry a JWT). Always returns `200` with
  `{"ResultCode": 0, "ResultDesc": "Accepted"}` regardless of the payload
  — Daraja retries a callback that doesn't get exactly this
  acknowledgement.

## POST /api/admin/donations

Staff/admin logging a donation received in person — **any** type, including
a cash gift handed over rather than paid through the public form. This is
the only way a Food/Equipment donation gets created.

- **Auth:** `admin` or `staff`.
- **Request:**
  ```json
  {
    "donation_type": "Cash | Food | Equipment, required",
    "donor_name": "string, required, max 120",
    "donor_email": "email, optional",
    "donor_phone": "string, optional, max 40",
    "amount": "number > 0, required for Cash, optional estimated value otherwise",
    "currency": "KES, optional, default KES",
    "payment_method": "M-Pesa | Card (Stripe) | PayPal, optional, Cash only",
    "campaign": "string, optional, max 120",
    "item_description": "string, required for Food/Equipment, max 1000",
    "quantity": "number > 0, required for Food/Equipment",
    "unit": "string, required for Food/Equipment, max 30",
    "message": "string, optional, max 2000"
  }
  ```
- **Response `201`:** `{ "donation": { ... } }` — `status` is `Paid` for Cash, `Received` otherwise; `frequency` is always `one-time` here (recurring in-person gifts aren't tracked as a schedule).
- **Errors:** `400` validation — missing `amount` for Cash, or missing `item_description`/`quantity`/`unit` for Food/Equipment.

## GET /api/donations

- **Auth:** `admin` or `staff`.
- **Query params (optional):** `donation_type` (`Cash` | `Food` | `Equipment`).
- **Response `200`:** `{ "donations": [ { ... }, ... ] }`, newest first, every type together.

## GET /api/donations/export.csv

- **Auth:** `admin` or `staff`.
- **Response `200`:** `text/csv` file download. Columns: Donor, Email, Amount, Currency, Frequency, Campaign, Payment Method, Status, Transaction ID, Receipt ID, Date, Type, Item Description, Quantity, Unit — the last four appended at the end so nothing reading the file positionally by the original 11 columns breaks. Use `downloadFile()` from `frontend/src/lib/api.js`, not plain `fetch`.

## GET /api/donations/{id}

- **Auth:** `admin` or `staff`.
- **Response `200`:** `{ "donation": { ... } }`
- **Errors:** `404`.

## PATCH /api/donations/{id}

- **Auth:** `admin` or `staff`.
- **Request:** any subset of `donation_type`, `donor_name`, `donor_email`, `donor_phone`, `amount`, `frequency`, `campaign`, `payment_method`, `item_description`, `quantity`, `unit`, `status` (`Paid` | `Pending` | `Received`). Omitted fields are left unchanged, never reset to a default.
- **Response `200`:** `{ "donation": { ... } }`
- **Errors:** `400` validation, `404`.
