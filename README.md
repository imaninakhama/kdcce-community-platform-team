# KDCCE Community Platform

A course project inspired by the mission of Kibera Day Care Centre for the
Elderly (KDCCE) — **not affiliated with or endorsed by the real
organization**. A public site (programs, gallery, team, donations, contact)
today, growing into an internal elderly-care operations system (elderly
member records, attendance, health & wellness, home visits, volunteer
management, and more).

This is a group project. The repo is split so frontend and backend teams can
work independently against a documented API contract.

```
kdcce-community-platform/
├── frontend/     React + Vite + Tailwind. See frontend/README.md.
├── backend/      Flask API + SQLAlchemy + JWT auth. See backend/README.md.
├── docs/api/     API contract: one file per module, endpoint/method/auth/
│                 request/response/errors/role. Read before wiring a new
│                 frontend screen to an existing or new endpoint.
└── docker-compose.yml   Dev environment: both services with hot reload.
```

## Quickstart

### Option A — Docker (both services at once)

```bash
docker compose up
```

Frontend: `http://localhost:5173`. Backend: `http://localhost:5000`.

First run only, apply migrations inside the backend container:

```bash
docker compose exec backend flask db upgrade
```

### Option B — Run each side natively

See `backend/README.md` and `frontend/README.md` for full setup. Short version:

```bash
# backend
cd backend
python3 -m venv .venv && ./.venv/bin/pip install -r requirements.txt
cp .env.example .env
FLASK_APP=wsgi.py ./.venv/bin/python3 -m flask db upgrade
./.venv/bin/python3 -m flask run --port 5000

# frontend (separate terminal)
cd frontend
npm install
cp .env.example .env
npm run dev
```

## Demo Login Credentials

⚠️ **These credentials are for local development/demo purposes only. Do
not use them in production, and never seed a real deployment with a
password this simple.**

A fresh clone has an empty database — none of these accounts exist until
someone creates them locally by running the seed commands below. They're
not hardcoded into the app; they're just what running those commands with
these specific values produces.

### Admin

```
Email:    admin@kdcce.local
Password: changeme123
```

### Volunteer 1 (Verified — assigned Elderly 1–4)

```
Email:    grace.mwangi@example.com
Password: GraceDemo2026!
```

### Volunteer 2 (Verified — assigned Elderly 5–8)

```
Email:    daniel.otieno@example.com
Password: DanielDemo2026!
```

### Volunteer 3 (Verified — assigned Elderly 9–12)

```
Email:    faith.wanjiru@example.com
Password: FaithDemo2026!
```

### Volunteer 4 (Verified — assigned Elderly 13–16)

```
Email:    samuel.kiptoo@example.com
Password: SamuelDemo2026!
```

### Volunteer 5 (Verified — assigned Elderly 17–20)

```
Email:    esther.njeri@example.com
Password: EstherDemo2026!
```

### Demo data

Running `flask seed-demo` (see below) creates:

- **5 volunteers**, all `Verified` — different skills, availability,
  experience and areas of interest each, so the admin volunteer list
  looks realistic rather than identical rows.
- **20 elderly members** — fictional Kibera-area residents with varied
  gender, age, OPA/community-group membership (2 demo OPAs, some members
  in neither), emergency contacts, health notes, allergies, dietary
  requirements, and vulnerability notes.
- **20 home-visit assignments** — the existing `HomeVisit.assigned_to_id`
  mechanism, 4 elderly members assigned to each volunteer in order
  (Volunteer 1 → Elderly 1–4, Volunteer 2 → Elderly 5–8, ...), each
  firing the normal assignment notification.

All fictional, all `@example.com`, no real person's information.

### Running the demo seed

```bash
cd backend

# 1. Create the admin account (needed first — the demo seed needs an
#    existing admin/staff user to record as who requested each visit)
FLASK_APP=wsgi.py ./.venv/bin/python3 -m flask seed-admin \
  --name "Admin" --email "admin@kdcce.local" --password "changeme123" --role admin

# 2. Create the 5 volunteers, 20 elderly members, and their assignments
FLASK_APP=wsgi.py ./.venv/bin/python3 -m flask seed-demo
```

`seed-demo` is idempotent — every insert is guarded by an existence check
first (by email, elder name, or OPA name), so running it again after it's
already run fills in anything missing and never creates duplicates. It
never deletes, resets, or modifies existing data.

Want a volunteer application in a non-Verified state to test that flow
too (e.g. the "application under review" or "not approved" portal
screens)? That still has to go through the real public flow — register,
then have the admin approve/reject it via `/admin/volunteers` or:

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"...","email":"...@example.com","password":"..."}'
```

## Donations — M-Pesa sandbox testing

The public donation form (`/donate`, and the monthly option on `/sponsor`)
goes through Safaricom's real Daraja **sandbox** API — no other payment
method is wired up, and nothing here ever touches real money. To exercise
the full flow locally:

1. Create a free app at [developer.safaricom.co.ke](https://developer.safaricom.co.ke)
   and copy its sandbox **Consumer Key**/**Consumer Secret**.
2. Set `MPESA_CONSUMER_KEY` / `MPESA_CONSUMER_SECRET` in `backend/.env`.
   `MPESA_SHORTCODE`/`MPESA_PASSKEY` already default to Safaricom's shared
   published sandbox test values — you only need your own if you were
   issued a dedicated sandbox shortcode.
3. Safaricom's servers call your callback directly, so `localhost` doesn't
   work for `MPESA_CALLBACK_URL` — run a tunnel (`ngrok http 5000`) and set
   `MPESA_CALLBACK_URL=https://<your-id>.ngrok-free.app/api/mpesa/callback`.
4. Use one of Safaricom's published sandbox test phone numbers when the
   donation form asks for an M-Pesa number, e.g. **254708374149** — see
   [Safaricom's Daraja docs](https://developer.safaricom.co.ke/Documentation)
   for the current list and sandbox PIN.

Without this configured, the donation form still works end-to-end for
everything except the actual STK push: it returns a clear "M-Pesa is not
configured" error (502) instead of a confusing failure. A donation is only
ever marked Paid by Safaricom's own callback confirming it, never
optimistically — a confirmation receipt is shown on-screen either way, and
a confirmation email is sent (or logged to the backend console if no
`RESEND_API_KEY`/`SMTP_HOST` is configured — see `backend/.env.example`)
once the callback confirms payment.

## Deployment

Not deployed by default — this repo ships everything needed to deploy it,
but actually doing so requires your own hosting accounts/credentials.

- **Backend**: `backend/Procfile` runs `flask db upgrade` on release, then
  serves via `gunicorn wsgi:app` — this is the standard shape expected by
  Render, Railway, Fly.io, and Heroku-style platforms. Set `DATABASE_URL`
  to a real Postgres/MySQL instance (SQLite is dev-only) and every
  `backend/.env.example` variable relevant to the features you want live
  (at minimum `SECRET_KEY`, `JWT_SECRET_KEY`, `CORS_ORIGINS` set to your
  deployed frontend's origin, and the M-Pesa/email variables above if you
  want donations and notification emails to work in production too).
- **Frontend**: `npm run build` in `frontend/` produces a static `dist/`
  deployable to any static host (Netlify, Vercel, GitHub Pages, etc.) —
  set `VITE_API_URL` to your deployed backend's URL before building.

## Team ownership

- **Frontend team** works in `frontend/`: pages, components, forms, tables,
  dashboards, API integration (via `frontend/src/lib/api.js`), responsive
  design, accessibility.
- **Backend team** works in `backend/`: Flask blueprints, SQLAlchemy models,
  Alembic migrations, auth/RBAC, validation (Marshmallow schemas), business
  logic, pytest tests.
- **API contract** lives in `docs/api/` and is the shared source of truth
  between the two — update it in the same PR that adds or changes an
  endpoint, so the other side never has to guess the shape of a request or
  response.

## Branching

One feature branch per module, e.g. `feature/elderly-management`,
`feature/attendance`, `feature/home-visits`, `feature/volunteer-management`,
`feature/feeding`, `feature/health-wellness`. Each new backend module gets
its own Flask blueprint (`backend/app/<module>/`) and its own doc file under
`docs/api/`; each new frontend feature gets its own page/manager component
under `frontend/src/pages/` — this keeps different people's branches from
touching the same files.

## Tests

```bash
cd backend && ./.venv/bin/python3 -m pytest tests/ -v
cd frontend && npm run build   # no frontend test suite yet
```
