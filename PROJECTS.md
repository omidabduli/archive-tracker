# Project Lab

The Project Lab page (`projects/`) and its JSON feed (`api/project-lab.json`)
are generated at build time from `project-lab/projects.json`. Pushing a change
to `main` rebuilds and redeploys both.

## Add or update a project

1. Edit `project-lab/projects.json`.
2. Check it locally with `npm run dev`, then open http://localhost:4000/projects/.
3. Commit and push to `main`.

| Field | Required | Purpose |
| --- | --- | --- |
| `slug` | yes | Unique id: lowercase letters, digits and dashes. |
| `name` | yes | Card title. |
| `description` | yes | Card text. |
| `repository` | yes | Target of the "View code" button. |
| `tags` | yes | List of short labels (may be empty). |
| `status` | yes | `source` shows "Source available", `planned` shows "Preparing demo", `live` shows "Live demo". |
| `demoUrl` | when `live` | Target of the "Open live" button. |
| `branch` | no | Source branch, for reference. |

## Live demos

GitHub Pages only serves static files, so it cannot start Flask or Streamlit
processes the way the old server did (see `legacy/server/`). To show a live
demo, host it separately and link it:

- Browser-only apps: publish them from their own repository with GitHub Pages
  (`https://omidabduli.github.io/<repository>/`).
- Streamlit and Flask apps: Streamlit Community Cloud or any Python host.

Then set `"status": "live"` and `"demoUrl": "https://…"`. The build fails if a
project is marked `live` without a `demoUrl`, so a broken button never ships.

Public demos must never contain `.env` files, API keys, passwords, customer data
or private datasets, and must not expose unrestricted file writes,
internal-network requests, shell commands or administrative functions.

## Repositories & Demos

- `https://github.com/omidabduli/lake-simulation-timeseries` (Time-Series Forecasting - Source)
- `https://github.com/omidabduli/everest-coordinate-editor` (Everest Coordinate Editor - Source)
