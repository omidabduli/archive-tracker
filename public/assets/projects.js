// Turns the GitHub repository list into the projects shown on the site.
// Shared by the build (scripts/build.mjs) and the pages themselves, which
// re-check GitHub on load so a new repository appears before the next build.

// Add this topic to a repository on GitHub to keep it off the site.
export const hideTopic = "hide-from-archive";

const repositoryFields = ["name", "html_url", "description", "fork", "archived", "private", "has_pages", "homepage", "language", "topics", "created_at"];

export async function fetchRepositories(user, { token } = {}) {
  const headers = { Accept: "application/vnd.github+json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const repositories = [];
  for (let page = 1; ; page++) {
    const response = await fetch(`https://api.github.com/users/${encodeURIComponent(user)}/repos?type=owner&per_page=100&page=${page}`, { headers });
    if (!response.ok) throw new Error(`GitHub answered ${response.status} when listing ${user}'s repositories`);
    const batch = await response.json();
    repositories.push(...batch.map((repository) => Object.fromEntries(repositoryFields.map((field) => [field, repository[field]]))));
    if (batch.length < 100) return repositories;
  }
}

export function selectRepositories(repositories, settings) {
  const excluded = new Set([settings.github, ...(settings.exclude || [])].map((name) => name.toLowerCase()));
  return repositories.filter((repository) =>
    !repository.private && !repository.fork && !repository.archived &&
    !excluded.has(repository.name.toLowerCase()) &&
    !(repository.topics || []).includes(hideTopic));
}

// "lake-simulation_timeseries" -> "Lake Simulation Timeseries"
export function titleFromName(name) {
  return name.split(/[-_\s]+/).filter(Boolean).map((word) => word[0].toUpperCase() + word.slice(1)).join(" ");
}

function safeUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : "";
  } catch {
    return "";
  }
}

function automaticTags(repository) {
  const tags = repository.language ? [repository.language] : [];
  for (const topic of repository.topics || []) {
    const tag = topic.replaceAll("-", " ");
    if (!tags.some((existing) => existing.toLowerCase() === tag)) tags.push(tag);
  }
  return tags.slice(0, 4);
}

// `titles` maps a lowercase repository name to the title read from its README.
export function buildProjects(repositories, settings, titles = {}) {
  return selectRepositories(repositories, settings)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map((repository) => {
      const slug = repository.name.toLowerCase();
      const override = settings.overrides?.[repository.name] || {};
      const demoUrl = safeUrl(override.demoUrl) || safeUrl(repository.homepage) ||
        (repository.has_pages ? `https://${settings.github.toLowerCase()}.github.io/${repository.name}/` : "");
      return {
        slug,
        name: override.name || titles[slug] || titleFromName(repository.name),
        description: override.description ?? repository.description ?? "",
        repository: repository.html_url,
        demoUrl,
        status: demoUrl ? "live" : override.status === "planned" ? "planned" : "source",
        tags: override.tags || automaticTags(repository),
        createdAt: repository.created_at
      };
    });
}

export function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

const number = (index) => String(index + 1).padStart(2, "0");
const arrow = '<svg viewBox="0 0 24 24"><line x1="7" y1="17" x2="17" y2="7"></line><polyline points="7 7 17 7 17 17"></polyline></svg>';

// Rows in the "Selected work" section of the homepage. A row opens the live
// project if there is one, otherwise the repository.
export function renderWorkRows(projects) {
  return projects.map((project, index) => {
    const tags = [project.demoUrl ? "Live demo" : "GitHub", ...project.tags.slice(0, 3)].map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("");
    return `
      <a class="project reveal" href="${escapeHtml(project.demoUrl || project.repository)}" target="_blank" rel="noopener noreferrer"><span class="project-no">${number(index)}</span><h3>${escapeHtml(project.name)}</h3><div class="project-copy"><p>${escapeHtml(project.description)}</p><div class="tags">${tags}</div></div><span class="project-arrow" aria-hidden="true">${arrow}</span></a>`;
  }).join("");
}

// Cards on the Project Lab page.
export function renderLabCards(projects) {
  return projects.map((project, index) => {
    const isLive = project.status === "live";
    const status = isLive ? "Live demo" : project.status === "planned" ? "Preparing demo" : "Source available";
    const liveLink = isLive
      ? `<a class="button primary" href="${escapeHtml(project.demoUrl)}" target="_blank" rel="noopener noreferrer">Open live &#xFE0E;↗</a>`
      : "";
    return `
      <article class="project">
        <div class="number">${number(index)}</div>
        <div>
          <div class="status ${isLive ? "online" : ""}"><span></span>${escapeHtml(status)}</div>
          <h2>${escapeHtml(project.name)}</h2>
          <p>${escapeHtml(project.description)}</p>
          <div class="tags">${project.tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}</div>
        </div>
        <div class="actions">
          ${liveLink}
          <a class="button" href="${escapeHtml(project.repository)}" target="_blank" rel="noopener noreferrer">View code &#xFE0E;↗</a>
        </div>
      </article>`;
  }).join("");
}

export function renderLabCount(projects) {
  return `${projects.length} repositories / ${projects.filter((project) => project.status === "live").length} live`;
}

// The build embeds its settings and projects in the page; this is the tag.
export function renderPageData(settings, projects) {
  const json = JSON.stringify({ settings, projects }).replaceAll("<", "\\u003c");
  return `<script type="application/json" id="archive-data">${json}</script>`;
}

// Browser only: asks GitHub for the current repositories and calls `update`
// with the new project list if it differs from what the build rendered.
// Errors (offline, rate limit) are ignored and the built list stays.
export async function refreshFromGitHub(update) {
  try {
    const { settings, projects: built } = JSON.parse(document.getElementById("archive-data").textContent);
    const cacheKey = `archive-repositories:${settings.github}`;
    let repositories;
    try {
      const cached = JSON.parse(sessionStorage.getItem(cacheKey));
      if (cached && Date.now() - cached.time < 10 * 60 * 1000) repositories = cached.repositories;
    } catch {}
    if (!repositories) {
      repositories = await fetchRepositories(settings.github);
      try { sessionStorage.setItem(cacheKey, JSON.stringify({ time: Date.now(), repositories })); } catch {}
    }
    // Keep the README titles the build found; new repositories get a title from their name.
    const titles = Object.fromEntries(built.map((project) => [project.slug, project.name]));
    const projects = buildProjects(repositories, settings, titles);
    if (JSON.stringify(projects) !== JSON.stringify(built)) update(projects);
  } catch {}
}
