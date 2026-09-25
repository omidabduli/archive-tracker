# Projects

The homepage's "Selected work" list, the Project Lab page (`projects/`) and its
JSON feed (`api/project-lab.json`) are generated from the public repositories
of the GitHub user named in `project-lab/projects.json`. A new repository
appears on the site by itself; nothing in this repository needs to change.

## How a new repository gets on the site

- **In the browser, right away.** Both pages ask the GitHub API for the current
  repository list when they load and add anything the last build did not know
  about. If GitHub cannot be reached or its rate limit is hit, the built list
  stays.
- **In the built pages, within a day.** The deploy workflow rebuilds the site
  every day, and on every push to `main`. The build is what search engines and
  visitors without JavaScript see, and it reads each project's name from its
  README (see below).

GitHub pauses scheduled workflows in a repository that has had no activity for
60 days and sends an email about it. The browser check keeps the site current
in the meantime; re-enable the workflow from the **Actions** tab, or push any
commit.

## Which repositories are shown

All public repositories owned by the user, newest first, except:

- forks and archived repositories,
- the profile repository (`omidabduli/omidabduli`),
- names listed in `exclude` (this site's own repository is there),
- repositories with the topic `hide-from-archive`. Add it on GitHub (the gear
  next to **About**) to hide a project without touching this site.

## Where each field comes from

| Shown | Source |
| --- | --- |
| Name | The README's first heading, without emoji and without a subtitle after a dash (`# 🏔️ Everest — Spatial Editor` becomes "Everest"); otherwise the repository name with dashes turned into spaces. |
| Description | The repository's GitHub description (**About**). |
| Tags | The main language plus the repository topics, up to four. The homepage shows the first three after "GitHub". |
| "Open live" | The repository's website field (**About → Website**), or its GitHub Pages site if Pages is enabled. |
| Order | Newest repository first. |

Only the build reads READMEs. A repository added since the last build shows the
name made from its repository name until the next daily build.

## Adjusting a project

`project-lab/projects.json` holds the settings and optional overrides, keyed by
repository name exactly as on GitHub:

```json
{
  "github": "omidabduli",
  "exclude": ["archive-tracker"],
  "overrides": {
    "lake-simulation-timeseries": {
      "name": "Time-Series Forecasting",
      "description": "Text used instead of the GitHub description.",
      "tags": ["Python", "XGBoost"]
    }
  }
}
```

| Override field | Effect |
| --- | --- |
| `name` | Title instead of the README heading. |
| `description` | Text instead of the GitHub description. |
| `tags` | Tags instead of language and topics. |
| `demoUrl` | "Open live" target instead of the website field or Pages site. |
| `status` | `"planned"` shows "Preparing demo" for a project without a demo. A project with a demo is always "Live demo". |

Check changes locally with `npm run dev` (http://localhost:4000/ and
http://localhost:4000/projects/), then commit and push to `main`.

## Live demos

GitHub Pages only serves static files, so it cannot start Flask or Streamlit
processes the way the old server did (see `legacy/server/`). To show a live
demo, host it separately and put its address in the repository's **Website**
field on GitHub:

- Browser-only apps: publish them from their own repository with GitHub Pages
  (`https://omidabduli.github.io/<repository>/`); the site finds these on its own.
- Streamlit and Flask apps: Streamlit Community Cloud or any Python host.

Public demos must never contain `.env` files, API keys, passwords, customer data
or private datasets, and must not expose unrestricted file writes,
internal-network requests, shell commands or administrative functions.
