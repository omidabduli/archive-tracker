# Migration to GitHub Pages

Date: 2026-09-21

**Classification: B, mostly client-side.** The pages were already static HTML,
CSS and JavaScript. The server-side work was rendering the Project Lab from a
JSON file and serving that file as an API, both of which are now done at build
time. The one feature that needs a real server, the live-demo proxy, was never
used: no project in the manifest has ever been marked `live`. Everything the
site currently does now runs on GitHub Pages.

The site was also renamed from "Roland Digital" to "Archive Tracker".

## 1. Original architecture

- **Hosting:** a Hetzner server running `server.js` (Node.js/Express) under
  `pm2`. TLS and the forwarding from the public domain to the app port are
  configured on the server, not in this repository. The
  `/home/<site-user>/htdocs/<domain>` layout suggests a CloudPanel-style setup.
- **Deployment:** `deploy.command`, run on the Mac, uploaded the working tree
  with `sshpass` + `rsync` (password login, host-key checking disabled), then ran
  `npm install` and `pm2 restart` on the server. The server IP, SSH user and
  password came from the local `.env`.
- **What the Express server did:**

  | Route | Behaviour |
  | --- | --- |
  | `/` and static files | Served `public/` (one page with inline CSS and JS). |
  | `/projects` | Rendered the Project Lab HTML on every request from `project-lab/projects.json`. |
  | `/api/project-lab` | Returned the manifest as JSON with `port` removed. |
  | `/projects/<slug>/` | Reverse proxy, including WebSockets, to Flask/Streamlit demos on `127.0.0.1:4101–4199`, started by `publish-project.command`. Unknown or non-live slugs got a "Project not found" page. |
  | `/impressum` | `410 Gone` with `X-Robots-Tag: noindex`. |
  | Anything else | The homepage, with status 200. |
  | Every response | `X-Content-Type-Options`, `Referrer-Policy` and `Permissions-Policy` headers; `no-store` caching for HTML. |

- `npm run build` produced a serverless worker bundle (`dist/server/index.js`)
  that the Hetzner deployment did not use.
- Not present: databases, authentication, file uploads, cron jobs, Docker,
  nginx or systemd files, numerical or data-processing code, and external APIs
  other than Google Fonts. WebSockets were only passed through to demos.

## 2. New architecture

```
Browser
  ↓
GitHub Pages (static files from dist/)
  ↓
Inline JavaScript in the page (scroll reveals, draggable ball)
```

- `scripts/build.mjs` uses only Node.js built-ins. It copies `public/` to
  `dist/`, fills in `%SITE_URL%` and `%BASE_PATH%`, renders
  `dist/projects/index.html` from the manifest with the old server's template,
  and writes `dist/api/project-lab.json`.
- `.github/workflows/deploy-pages.yml` builds and deploys on every push to
  `main`.
- `scripts/preview.mjs` and `scripts/dev.mjs` replace `node server.js` for
  local work. The preview server follows GitHub Pages' rules, so the site can be
  tested below `/archive-tracker/` before it is deployed.

## 3. What was changed

- **Project Lab:** rendering moved from request time (`server.js`) to build time
  (`scripts/build.mjs`) with the same markup.
- **Paths:** root-absolute links (`/projects`, `/favicon.svg`, …) are now
  relative, so the site works below `/REPOSITORY/` and on a custom domain.
- **Absolute URLs:** the canonical link, `og:url`, the sitemap entries and the
  `robots.txt` sitemap line are now filled in at build time from the GitHub
  Pages URL instead of `https://roland-digital.de/`.
- **Favicons:** the Project Lab page now links its icons. It used to rely on
  `/favicon.ico` at the domain root, which doesn't exist for a site served from
  a sub-path.
- **Referrer policy:** the `Referrer-Policy` header became
  `<meta name="referrer" content="strict-origin-when-cross-origin">` on every
  page, with the same policy.
- **Live demos:** "Open live" buttons now link to a new optional `demoUrl`
  field instead of the server proxy. The build fails for a `live` project
  without one.
- **Unknown URLs:** these now show a 404 page (`public/404.html`, styled like
  the old "Project not found" page) with status 404, instead of the homepage
  with status 200.
- **Rename:** the site is now "Archive Tracker" in the title, meta
  description, Open Graph tags, header, hero text, footer, Project Lab, 404
  page and package name. The hero sentence that explained the old name was
  shortened to "My journey began in Bremen, and this archive carries that origin
  forward…".
- **`package.json`:** renamed to `archive-tracker` and marked `private`.
  `express` and `dotenv` were removed, leaving 0 dependencies. New
  `dev`/`build`/`preview` scripts; requires Node.js 22 or newer.
- **`.gitignore`:** now covers all `.env.*` files, keys and certificates,
  Python virtualenvs and caches, logs, editor folders and local tool state.
- **Docs:** `PROJECTS.md` was rewritten for the new workflow, and `README.md`
  was added.
- **Carried over:** the uncommitted content changes that were in the working
  tree before the migration (Everest Coordinate Editor entry, the
  "Time-Series Forecasting" name, SVG arrow icons) are part of the new version.

## 4. What was removed

- `public/roland-mark.svg`: a byte-identical copy of `favicon.svg` that
  carried the old name. Its `<link>` tag was removed; the icon looks the same.
- The `/impressum` 410 route and its `robots.txt` `Disallow` lines. They
  existed to get the removed page de-indexed on roland-digital.de. That page
  never existed at the new address, and GitHub Pages answers 404 there.
- Moved rather than deleted, to `legacy/server/`: `server.js`, `deploy.command`,
  `publish-project.command`, `register-project.command`, the Python helpers from
  `project-lab/runtime/`, and the old worker build.
- Not reproducible on GitHub Pages, and not needed by any current page:
  - `410` status codes
  - custom HTTP headers (GitHub Pages sends neither `Permissions-Policy` nor
    `X-Content-Type-Options`; the site uses no camera, microphone or location
    features)
  - `no-store` caching: GitHub Pages caches for 10 minutes
  - the live-demo reverse proxy and WebSocket proxy

## 5. What was converted from backend to frontend

| Before (server, per request) | After (static, at build time) | Checked |
| --- | --- | --- |
| `GET /projects` | `projects/index.html` | Diffed against the old server's output: identical apart from the new name, relative links, favicon links and the referrer meta tag. |
| `GET /api/project-lab` | `api/project-lab.json` | Byte-identical output. |
| Catch-all → homepage | `404.html` | By design. |

Both implementations were compared with the real manifest and with a test
manifest covering `live`, `planned` and `source` projects and HTML escaping.
All rendering branches matched; the only intended difference is the live
button's link. The repository contains no calculations, time-series, CSV or
plotting code; the time-series project is only linked on GitHub. Nothing
numerical had to be ported.

## 6. Remaining backend dependencies

None for the current site.

A server-side component would only be needed again for live Flask/Streamlit
demos. None is live today. Host future demos separately and link them with
`demoUrl` (see `PROJECTS.md`).

## 7. Security issues found

- **No secrets in the repository or its history.** Every commit was searched
  for the values in `.env` and for common secret patterns (passwords, tokens,
  API keys, private keys, IP addresses). The SSH password and the server IP
  never appear. `.env` was never committed and stays git-ignored.
- **Plain-text server password in the local `.env`.** It holds the Hetzner SSH
  password. After the server is shut down, delete that user or change its
  password, then delete the local `.env`.
- **Insecure deploy scripts (retired).** They used password SSH with
  `StrictHostKeyChecking=no`, which allows man-in-the-middle attacks. They are
  no longer used; see `legacy/server/README.md`.
- **Publishing.** On GitHub Free, Pages requires a public repository. Instead
  of making the old private repository public, the site is published from a
  new public repository, `omidabduli/archive-tracker`, whose history starts
  with this migration. The old name and the old contact email from earlier
  commits are not in it, and its commits use GitHub's noreply address. The
  private repository `omidabduli/roland-digital-website` is unchanged and still
  holds the full old history.
- **Build supply chain.** The build has no npm dependencies (`npm audit`: 0
  vulnerabilities). The workflow uses only official `actions/*` actions and the
  permissions from GitHub's Pages template (`contents: read`, `pages: write`,
  `id-token: write`).
- **Privacy (unchanged).** The site loads Google Fonts from Google's servers,
  and GitHub, as host, processes visitors' IP addresses. For a site run from
  Germany this may deserve a privacy notice; self-hosting the fonts would remove
  the Google part. Neither was changed, to keep the site identical.

## 8. GitHub Pages deployment configuration

- Workflow: `.github/workflows/deploy-pages.yml`
- Triggers: push to `main`, and manual start (**Actions → Deploy to GitHub
  Pages → Run workflow**).
- Build job: `actions/checkout@v7` → `actions/setup-node@v7` (Node 24) →
  `actions/configure-pages@v6`, which provides the site URL → `npm ci` →
  `npm run build` with `SITE_URL` set to that URL →
  `actions/upload-pages-artifact@v5` (`dist/`).
- Deploy job: `actions/deploy-pages@v5` into the `github-pages` environment.
- Concurrency group `pages`: one deployment at a time; running deployments are
  not cancelled.
- These are the current major versions as of this migration. GitHub's starter
  template still lists some older majors.
- Repository setting (done): **Settings → Pages → Source: GitHub Actions**.
- If `SITE_URL` were ever missing in CI, the build fails instead of publishing
  `localhost` links.

## 9. Custom-domain configuration

No `CNAME` file was created, for two reasons:

- roland-digital.de is being retired, so there is no production domain to
  carry over.
- For deployments from a GitHub Actions workflow, GitHub ignores `CNAME` files.
  The domain is set under **Settings → Pages → Custom domain** instead.

The site is ready for a domain: links are relative and the build picks up the
domain from GitHub automatically. The DNS records and steps are in `README.md`
under "Custom domain". In short:

- `CNAME` for `www` → `omidabduli.github.io`
- apex `A` records → `185.199.108.153`, `185.199.109.153`, `185.199.110.153`,
  `185.199.111.153`
- optional apex `AAAA` records → `2606:50c0:8000::153` to
  `2606:50c0:8003::153`

No DNS changes were made. roland-digital.de still points to Hetzner.

## 10. Manual steps you still need to perform

Already done: the public repository `omidabduli/archive-tracker` was created,
GitHub Pages was enabled with GitHub Actions as its source, and the site was
pushed and deployed to https://omidabduli.github.io/archive-tracker/.

1. **Replace links to roland-digital.de:** the website field on your GitHub
   profile (currently `https://roland-digital.de/`), LinkedIn and anything else
   that points there.
2. **Shut down the Hetzner site** once you're happy with the new one:
   - stop and delete the `pm2` process
   - delete the site on the server
   - remove the SSH user or change its password
   - delete the local `.env`
   - optionally delete `legacy/server/`
3. **Decide what to do with the old private repository**
   `omidabduli/roland-digital-website`: keep it as a backup, archive it
   (**Settings → General → Archive this repository**) or delete it.
4. Optional: rename the local folder "Roland Digital Website".

## 11. How to roll back to the Hetzner version

- **Nothing on the server was touched.** Hetzner keeps serving the last
  deployed version until you shut it down, and the roland-digital.de DNS is
  unchanged. Until then, going back only means not switching over.
- **To redeploy the old server version:** the pre-migration history is in the
  private repository `omidabduli/roland-digital-website`, and in the original
  working copy on the local branch `legacy-main`. Check out its last commit and
  run the old deploy script with the local `.env`:

  ```bash
  git checkout 39b283e
  ./deploy.command
  git checkout main
  ```

  That commit predates the uncommitted content changes listed in section 3.
  Those changes exist only in the new repository.
- **To take the GitHub Pages site offline:** **Settings → Pages → Unpublish
  site**, or make the repository private.
