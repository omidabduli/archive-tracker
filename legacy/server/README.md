# Legacy server deployment (retired)

Until the move to GitHub Pages, the site ran as a Node.js process on a Hetzner
server. These files are kept for reference and rollback only: nothing here is
part of the GitHub Pages build or published on the website. Delete this folder
once the Hetzner site is shut down; Git history keeps it.

Apart from replacing the old site name and its hardcoded domain, the files are
unchanged.

| File | What it did |
| --- | --- |
| `server.js` | Express server: served `public/`, rendered the Project Lab from `project-lab/projects.json` on each request, answered `/api/project-lab`, returned `410 Gone` for `/impressum`, set security and cache headers, and reverse-proxied `/projects/<slug>/` (including WebSockets) to demo processes on `127.0.0.1:4101–4199`. |
| `deploy.command` | Built locally, uploaded the site with `sshpass` + `rsync` to `/home/<site-user>/htdocs/<domain>`, then ran `npm install` and restarted it with `pm2`. |
| `publish-project.command` | Cloned a demo repository on the server, created a Python virtualenv with `uv` and started the demo under `pm2` (Streamlit, or Flask via Gunicorn). |
| `register-project.command` | Added a Flask or Streamlit repository to the manifest with a free port between 4101 and 4199. |
| `project-lab-runtime/` | Python helpers the two scripts above ran on the server (they lived in `project-lab/runtime/`). |
| `build-worker.mjs` | The previous `npm run build`: bundled `public/` into a single serverless worker (`dist/server/index.js`). The Hetzner deploy ran it only as a check. |

## Running them again

The scripts expect the pre-migration layout (`server.js`, the `.command` files
and `project-lab/runtime/` at the repository root) and a local `.env` with
`domain` (SSH/site user), `port`, `site-user-password`, `domain-name` and
`server-ip`. They do not run from this folder; to go back to the server version,
move them back to the repository root.

Requirements: `express@^4.19.2` and `dotenv@^16.4.5` (from the old
`package.json`), `sshpass` and `rsync` locally, Node.js with `pm2` on the
server, and `uv` with Python for demos.

## Security notes

`deploy.command` and `publish-project.command` log in with a password via
`sshpass` and disable host-key checking (`StrictHostKeyChecking=no`), which
allows man-in-the-middle attacks. If they are ever reused, switch to SSH keys
and verified host keys.
