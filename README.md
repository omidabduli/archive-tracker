# Archive Tracker

Personal portfolio and working archive of Omid Abduli: a one-page site
(`public/index.html`) and a Project Lab page generated from
`project-lab/projects.json`. It is a static site hosted on GitHub Pages.

## Local development

Requires Node.js 22 or newer. The project has no runtime dependencies.

```bash
npm install
npm run dev
```

Open http://localhost:4000/. The site is rebuilt whenever a file in `public/` or
`project-lab/` changes; reload the page to see the result.

To test it the way GitHub Pages serves it, below a repository path:

```bash
SITE_URL=http://localhost:4000/archive-tracker/ npm run dev
```

## Production build

```bash
npm run build
```

The site is written to `dist/`. `npm run preview` serves an existing build.

The `SITE_URL` environment variable sets the address used for the canonical
link, the Open Graph URL, `sitemap.xml`, `robots.txt` and the links on the 404
page (default `http://localhost:4000/`). The deploy workflow sets it
automatically.

## Project structure

| Path | Contents |
| --- | --- |
| `public/` | Homepage, 404 page, icons, `robots.txt`, `sitemap.xml`. `%SITE_URL%` and `%BASE_PATH%` are filled in at build time. |
| `project-lab/projects.json` | Project Lab catalogue, see [PROJECTS.md](PROJECTS.md). |
| `scripts/build.mjs` | Static build: copies `public/`, renders the Project Lab and `api/project-lab.json`. |
| `scripts/preview.mjs` | Local server that follows GitHub Pages' rules (base path, trailing-slash redirects, `404.html`). |
| `scripts/dev.mjs` | Build, preview and rebuild on change. |
| `.github/workflows/deploy-pages.yml` | Build and deployment to GitHub Pages. |
| `legacy/server/` | Retired Hetzner server files, kept for reference. |

## GitHub Pages deployment

Every push to `main` runs [`deploy-pages.yml`](.github/workflows/deploy-pages.yml):
it installs dependencies, builds the site with the repository's Pages URL and
publishes `dist/` to GitHub Pages. Progress is shown in the repository's
**Actions** tab, where **Run workflow** also starts a deployment manually.

This requires the repository setting **Settings → Pages → Build and
deployment → Source: GitHub Actions** (already configured).

GitHub Pages caches pages for up to 10 minutes, so a deployment can take that
long to appear for returning visitors.

## GitHub Pages URL

Sites are served at `https://USERNAME.github.io/REPOSITORY/`. For this
repository, named `archive-tracker`, that is
`https://omidabduli.github.io/archive-tracker/`. All internal links are relative
and the build reads the URL from GitHub, so renaming the repository or adding a
custom domain needs no code changes.

## Custom domain

No custom domain is configured. To add one:

1. Recommended first: verify the domain in your GitHub profile settings
   (**Settings → Pages → Add a domain**, then add the TXT record it shows) to
   prevent takeovers.
2. In the repository, open **Settings → Pages → Custom domain**, enter the
   domain and save. Deployments from GitHub Actions ignore `CNAME` files, so the
   repository does not contain one.
3. Create the DNS records at your DNS provider:

   | Domain | Type | Name | Value |
   | --- | --- | --- | --- |
   | Subdomain, e.g. `www.example.com` | `CNAME` | `www` | `omidabduli.github.io` |
   | Apex, e.g. `example.com` | `A` | `@` | `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153` |
   | Apex (optional IPv6) | `AAAA` | `@` | `2606:50c0:8000::153`, `2606:50c0:8001::153`, `2606:50c0:8002::153`, `2606:50c0:8003::153` |

4. Tick **Enforce HTTPS** once GitHub has issued the certificate.
5. Re-run the deploy workflow so canonical links and the sitemap use the new
   domain.

`robots.txt` and `sitemap.xml` only take effect at the root of a domain; under
`github.io/archive-tracker/` crawlers ignore them, but the sitemap can still be
submitted in Google Search Console.

## Architecture

Fully static. Browsers load HTML with inline CSS and JavaScript, the icons and
Google Fonts; the interactive parts (scroll reveals, the draggable ball) run in
the browser. There is no server-side code, database or API key. The build step
only renders the Project Lab from its manifest and fills in the site URL.

## Remaining server dependencies

None for the current site. Live Flask/Streamlit demos, which the old Hetzner
server could run under `/projects/<slug>/`, cannot run on GitHub Pages; none is
published at the moment. Future demos need their own hosting and are linked with
`demoUrl` (see [PROJECTS.md](PROJECTS.md)).
