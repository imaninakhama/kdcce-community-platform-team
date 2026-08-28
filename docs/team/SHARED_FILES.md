# Shared Files

These files touch multiple feature areas or are the application's cross-cutting backbone. They are intentionally **not** assigned to a single member. Coordinate in the team channel before editing one — smallest safe change, and flag it before you start.

### `backend/app/__init__.py`

**Reason:** Flask application factory — registers every blueprint from every module.

**Rule:** Members must coordinate before modifying — post in the team channel, keep the diff minimal, and avoid touching it in the same window as someone else.

### `backend/app/cli.py`

**Reason:** `seed-admin` / `seed-demo` CLI commands that touch models from nearly every module.

**Rule:** Members must coordinate before modifying — post in the team channel, keep the diff minimal, and avoid touching it in the same window as someone else.

### `backend/app/config.py`

**Reason:** App-wide configuration (env vars, DB URI, JWT settings) used by every module.

**Rule:** Members must coordinate before modifying — post in the team channel, keep the diff minimal, and avoid touching it in the same window as someone else.

### `backend/app/extensions.py`

**Reason:** Shared singletons (SQLAlchemy `db`, JWT manager, rate limiter) every module imports.

**Rule:** Members must coordinate before modifying — post in the team channel, keep the diff minimal, and avoid touching it in the same window as someone else.

### `backend/app/models.py`

**Reason:** Single file holding all 30 SQLAlchemy models across every feature area.

**Rule:** Members must coordinate before modifying — post in the team channel, keep the diff minimal, and avoid touching it in the same window as someone else.

### `backend/app/utils.py`

**Reason:** Small shared helpers (`get_or_404`, `validation_error_response`, `csv_response`) used across modules.

**Rule:** Members must coordinate before modifying — post in the team channel, keep the diff minimal, and avoid touching it in the same window as someone else.

### `backend/tests/conftest.py`

**Reason:** Shared pytest fixtures (app, client, db) every test file depends on.

**Rule:** Members must coordinate before modifying — post in the team channel, keep the diff minimal, and avoid touching it in the same window as someone else.

### `backend/wsgi.py`

**Reason:** Application entry point.

**Rule:** Members must coordinate before modifying — post in the team channel, keep the diff minimal, and avoid touching it in the same window as someone else.

### `frontend/src/App.jsx`

**Reason:** Top-level route table wiring every page in the app.

**Rule:** Members must coordinate before modifying — post in the team channel, keep the diff minimal, and avoid touching it in the same window as someone else.

### `frontend/src/ErrorBoundary.jsx`

**Reason:** Wraps the entire app; not scoped to one feature.

**Rule:** Members must coordinate before modifying — post in the team channel, keep the diff minimal, and avoid touching it in the same window as someone else.

### `frontend/src/components/admin/GlobalSearch.jsx`

**Reason:** Cross-module admin search bar (elderly, volunteers, home visits, assistance, follow-ups).

**Rule:** Members must coordinate before modifying — post in the team channel, keep the diff minimal, and avoid touching it in the same window as someone else.

### `frontend/src/components/admin/Modal.jsx`

**Reason:** Generic modal used by most admin manager pages.

**Rule:** Members must coordinate before modifying — post in the team channel, keep the diff minimal, and avoid touching it in the same window as someone else.

### `frontend/src/components/admin/NotificationBell.jsx`

**Reason:** Cross-module notification bell shown in the admin shell header.

**Rule:** Members must coordinate before modifying — post in the team channel, keep the diff minimal, and avoid touching it in the same window as someone else.

### `frontend/src/components/admin/Shell.jsx`

**Reason:** Admin layout shell (nav, sidebar) every admin page renders inside.

**Rule:** Members must coordinate before modifying — post in the team channel, keep the diff minimal, and avoid touching it in the same window as someone else.

### `frontend/src/components/admin/Toast.jsx`

**Reason:** Generic toast notification used by most admin manager pages.

**Rule:** Members must coordinate before modifying — post in the team channel, keep the diff minimal, and avoid touching it in the same window as someone else.

### `frontend/src/components/admin/adminHelpers.jsx`

**Reason:** Shared admin helpers (loading/error states, toast hook) used across manager pages.

**Rule:** Members must coordinate before modifying — post in the team channel, keep the diff minimal, and avoid touching it in the same window as someone else.

### `frontend/src/index.css`

**Reason:** Global styles and design tokens used by every component.

**Rule:** Members must coordinate before modifying — post in the team channel, keep the diff minimal, and avoid touching it in the same window as someone else.

### `frontend/src/lib/api.js`

**Reason:** Core authenticated-fetch wrapper used by every page/module.

**Rule:** Members must coordinate before modifying — post in the team channel, keep the diff minimal, and avoid touching it in the same window as someone else.

### `frontend/src/lib/useApiList.js`

**Reason:** Generic list-fetching hook used broadly across admin and volunteer pages.

**Rule:** Members must coordinate before modifying — post in the team channel, keep the diff minimal, and avoid touching it in the same window as someone else.

### `frontend/src/lib/useApiResource.js`

**Reason:** Generic CRUD data-fetching hook used by nearly every admin manager page.

**Rule:** Members must coordinate before modifying — post in the team channel, keep the diff minimal, and avoid touching it in the same window as someone else.

### `frontend/src/main.jsx`

**Reason:** React app bootstrap/mount point.

**Rule:** Members must coordinate before modifying — post in the team channel, keep the diff minimal, and avoid touching it in the same window as someone else.

### `frontend/src/pages/AdminDashboard.jsx`

**Reason:** Single file containing the admin route table plus inline Blog/Gallery/Team/Crafts/Settings managers.

**Rule:** Members must coordinate before modifying — post in the team channel, keep the diff minimal, and avoid touching it in the same window as someone else.

### `frontend/src/theme/ThemeProvider.jsx`

**Reason:** Global light/dark theme context wrapping the whole app.

**Rule:** Members must coordinate before modifying — post in the team channel, keep the diff minimal, and avoid touching it in the same window as someone else.

### `frontend/src/theme/ThemeToggle.jsx`

**Reason:** Theme toggle control used in both admin and volunteer shells.

**Rule:** Members must coordinate before modifying — post in the team channel, keep the diff minimal, and avoid touching it in the same window as someone else.

## Also effectively shared: configuration & dependency files

These are not application source (nothing to blank/assign) but are also cross-cutting — don't change dependency versions without the team's agreement:

- `.gitignore`
- `README.md`
- `backend/.env.example`
- `backend/.gitignore`
- `backend/README.md`
- `backend/migrations/README`
- `backend/migrations/alembic.ini`
- `backend/migrations/env.py`
- `backend/migrations/script.py.mako`
- `backend/requirements.txt`
- `docker-compose.yml`
- `frontend/.env.example`
- `frontend/.gitignore`
- `frontend/README.md`
- `frontend/index.html`
- `frontend/package-lock.json`
- `frontend/package.json`
- `frontend/postcss.config.cjs`
- `frontend/tailwind.config.js`
- `frontend/vite.config.js`

## Static assets (`frontend/public/`)

27 image/video files, replicated as empty placeholders at their original paths. Not code, not assigned to anyone — copy the actual binary from the original repo into place whenever a page that needs it is being built. No coordination needed (binary files don't merge-conflict the way code does).

- `frontend/public/images/admin-login-bg.jpg`
- `frontend/public/images/aid-distribution.jpg`
- `frontend/public/images/blog.jpg`
- `frontend/public/images/community-gratitude.jpg`
- `frontend/public/images/community-market.jpg`
- `frontend/public/images/community.jpg`
- `frontend/public/images/contact.jpg`
- `frontend/public/images/crafts.jpg`
- `frontend/public/images/feeding.jpg`
- `frontend/public/images/health-checkup.jpg`
- `frontend/public/images/healthcare.jpg`
- `frontend/public/images/hero.jpg`
- `frontend/public/images/logo.png`
- `frontend/public/images/mary.jpg`
- `frontend/public/images/program-elderly.jpg`
- `frontend/public/images/program-health.jpg`
- `frontend/public/images/program-literacy.jpg`
- `frontend/public/images/programs.jpg`
- `frontend/public/images/social.jpg`
- `frontend/public/images/team-allan.jpg`
- `frontend/public/images/team-derrick.jpg`
- `frontend/public/images/team-imani.jpg`
- `frontend/public/images/team-jeremy.jpg`
- `frontend/public/images/team-john.jpg`
- `frontend/public/images/volunteer-support.jpg`
- `frontend/public/images/wheelchair-care.jpg`
- `frontend/public/videos/kdcce-intro.mp4`