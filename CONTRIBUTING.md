# Contributing

This repository is a **blank scaffold**, not a working copy of the app. It has
the same folder/file structure as the original repository, but every
application source file (`.py`, `.js`, `.jsx`) has been emptied out.
Configuration and dependency files (`package.json`, `requirements.txt`,
`docker-compose.yml`, etc.) are intact so you can install dependencies and
start filling files in.

The original repository — the only source of truth for actual code — is:

```
https://github.com/ayiekoderrick-8068/kdcce-community-platform
```

Your job is to copy each file you're assigned from that repository into the
matching blank file here, then commit and push.

## 1. Clone this repository

```bash
git clone <this-repo-url> kdcce-community-platform-team
cd kdcce-community-platform-team
```

## 2. Switch to your branches

You have two branches — one for frontend work, one for backend work. Find
your name in [TEAM_ASSIGNMENTS.md](TEAM_ASSIGNMENTS.md) and check out the
matching branches:

```bash
git checkout backend-<yourname>
# ...work on your backend files, commit, push...

git checkout frontend-<yourname>
# ...work on your frontend files, commit, push...
```

Example for Imani:

```bash
git checkout backend-imani
git checkout frontend-imani
```

## 3. Find your assigned files

Open [TEAM_ASSIGNMENTS.md](TEAM_ASSIGNMENTS.md) for your file list and
suggested commit plan, or check
[docs/team/FILE_OWNERSHIP.md](docs/team/FILE_OWNERSHIP.md) to look up who
owns any specific file.

Only touch files assigned to you. If a file you need isn't in your list,
check [docs/team/SHARED_FILES.md](docs/team/SHARED_FILES.md) — shared files
need coordination with the team before anyone edits them.

## 4. Copy code from the original repository

For each assigned file:

1. Open the file at the same path in the original repository (see the URL
   above — clone it separately, or browse it on GitHub).
2. Copy its full contents.
3. Open the matching blank file in this repository, on your branch.
4. Paste the contents in. Do not rename the file, move it, or change its
   path — the whole point is that the path here matches the path there
   exactly.

## 5. Test what you can

The scaffold won't run as a complete app until enough files are filled in —
that's expected. As you go:

- **Backend:** `cd backend && ./.venv/bin/python -m pytest tests/ -v` (once
  you've got dependencies installed — see the root `README.md`) to check the
  tests you copied in still pass against the code you copied in.
- **Frontend:** `cd frontend && npm run build` to catch syntax errors, or
  `npm run dev` once enough of the app is filled in to render something.

Don't invent fake implementations just to make things "run" — an incomplete
scaffold is expected while the team is still filling it in.

## 6. Commit

Follow the commit plan in your section of `TEAM_ASSIGNMENTS.md` — one commit
per logical unit of work (a module's routes+schemas, a migration, a page),
not one commit per file and not one giant commit for everything.

```bash
git add backend/app/auth/decorators.py backend/app/auth/routes.py backend/app/auth/schemas.py
git commit -m "Backend: auth module (decorators, routes, schemas)"
```

## 7. Push

```bash
git push origin backend-<yourname>
# or
git push origin frontend-<yourname>
```

## 8. Open a pull request

Open a PR from your branch into `main`. Keep frontend and backend PRs
separate, matching your two branches. Describe which original files you
copied from.

## 9. Stay in your lane

- Don't edit another member's assigned files.
- Don't edit files listed in `docs/team/SHARED_FILES.md` without coordinating
  first — post in the team channel, keep the change small.
- Don't rename, move, or reorganize anything — paths must keep matching the
  original repository so everyone can always find the source file to copy.
- Don't add new features, endpoints, components, or "improvements" beyond
  what you're copying from the original — this scaffold tracks the original
  app exactly.
