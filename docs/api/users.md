# Admin & staff accounts

`backend/app/users/` — lets an **admin** create/list/remove other admin and
staff accounts. Deliberately `admin`-only (not `staff`) — this is what
makes "Staff: content only, no user management" from the project brief a
real, backend-enforced distinction rather than just a hidden UI link. Never
touches volunteer accounts — those go through the separate self-registration
and admin-approval workflow in `backend/app/volunteers/` and are excluded
from every endpoint here.

Account object:
```json
{ "id": 1, "name": "...", "email": "...", "role": "admin", "created_at": "..." }
```

## GET /api/admin/users

- **Auth:** `admin` only.
- **Response `200`:** `{ "users": [ { ... }, ... ] }` — every `admin`/`staff`
  account (never `volunteer`), oldest first.
- **Errors:** `403` for `staff`/`volunteer`.

## POST /api/admin/users

- **Auth:** `admin` only.
- **Request:**
  ```json
  { "name": "string, required, max 120", "email": "email, required", "password": "string, required, min 8", "role": "admin | staff, required" }
  ```
- **Response `201`:** `{ "user": { ... } }`
- **Errors:** `400` validation (including `role: "volunteer"`, which is
  rejected here — that's a different account type created a different
  way); `409` if the email is already registered; `403` for `staff`/`volunteer`.

## DELETE /api/admin/users/{id}

- **Auth:** `admin` only.
- **Response `204`:** no body.
- **Errors:** `404` if the id doesn't exist or isn't an admin/staff account
  (a volunteer id included); `409` if you try to remove your own account
  (self-removal is blocked — the only way this endpoint could ever leave
  zero admins behind); `403` for `staff`/`volunteer`.
