import { cp, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { basename, dirname, extname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const publicDirectory = resolve(root, "public");
const outputDirectory = resolve(root, "dist");
const settingsFile = resolve(root, "project-lab", "projects.json");
const templateExtensions = new Set([".html", ".xml", ".txt"]);
const { buildProjects, fetchRepositories, renderLabCards, renderLabCount, renderPageData, renderWorkRows, selectRepositories } =
  await import(pathToFileURL(resolve(publicDirectory, "assets", "projects.js")));

// Full URL the site is served from, always ending in "/". The GitHub Pages
// workflow passes the Pages URL (https://USERNAME.github.io/REPOSITORY/ or a
// custom domain); local builds default to the preview server.
export function getSiteUrl() {
  const value = process.env.SITE_URL;
  if (!value && process.env.GITHUB_ACTIONS === "true") {
    throw new Error("SITE_URL is not set. The deploy workflow must pass the GitHub Pages URL.");
  }
  const url = new URL(value || "http://localhost:4000/");
  if (!url.pathname.endsWith("/")) url.pathname += "/";
  return url;
}

// First heading of a README, without emoji, links or a subtitle after a dash:
// "# 🏔️ Everest — Spatial Coordinate Editor" -> "Everest".
function readmeTitle(markdown) {
  const text = markdown.replace(/```[\s\S]*?```/g, "");
  const heading = [text.match(/^#[ \t]+(.+)$/m), text.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)]
    .filter(Boolean)
    .sort((a, b) => a.index - b.index)[0]?.[1] ?? "";
  const title = heading
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/[\p{Extended_Pictographic}\u200d\ufe0f]/gu, "")
    .replace(/[*_`]/g, "")
    .split(/\s+[—–|]\s+/)[0]
    .trim();
  return title.length <= 60 ? title : "";
}

// Repository data, kept between rebuilds of `npm run dev` so editing a file
// does not use up GitHub's rate limit (60 requests an hour without a token).
let githubCache;

async function loadGitHub(settings) {
  if (githubCache?.user === settings.github) return githubCache;
  const token = process.env.GITHUB_TOKEN;
  const repositories = await fetchRepositories(settings.github, { token });
  const headers = { Accept: "application/vnd.github.raw+json", ...(token && { Authorization: `Bearer ${token}` }) };
  const titles = {};
  await Promise.all(selectRepositories(repositories, settings).map(async (repository) => {
    const response = await fetch(`https://api.github.com/repos/${settings.github}/${repository.name}/readme`, { headers });
    if (response.ok) titles[repository.name.toLowerCase()] = readmeTitle(await response.text()) || undefined;
  }));
  githubCache = { user: settings.github, repositories, titles };
  return githubCache;
}

async function loadProjects() {
  const settings = JSON.parse(await readFile(settingsFile, "utf8"));
  if (!settings.github) throw new Error(`${settingsFile} needs a "github" user name.`);
  try {
    const { repositories, titles } = await loadGitHub(settings);
    return { settings, projects: buildProjects(repositories, settings, titles) };
  } catch (error) {
    // A deploy must not replace the live site with an empty list.
    if (process.env.GITHUB_ACTIONS === "true") throw error;
    console.warn(`Could not load repositories from GitHub (${error.message}); building without them. The pages still load them in the browser.`);
    return { settings, projects: [] };
  }
}

function renderProjectLab(settings, projects) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Project Lab — Archive Tracker</title>
  <meta name="description" content="Live experiments and open-source projects by Omid Abduli.">
  <meta name="referrer" content="strict-origin-when-cross-origin">
  <link rel="icon" href="../favicon.svg?v=3" type="image/svg+xml">
  <link rel="icon" type="image/png" sizes="32x32" href="../favicon-32x32.png?v=3">
  <link rel="icon" type="image/png" sizes="16x16" href="../favicon-16x16.png?v=3">
  <link rel="apple-touch-icon" sizes="180x180" href="../apple-touch-icon.png?v=3">
  <link rel="shortcut icon" href="../favicon.ico?v=3">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Manrope:wght@400;500;600&family=Newsreader:opsz,wght@6..72,400;6..72,500&display=swap" rel="stylesheet">
  <style>
    :root{--paper:#f2efe7;--ink:#171714;--line:#c9c5ba;--blue:#1648d8;--mono:"DM Mono",monospace;--sans:"Manrope",sans-serif;--serif:"Newsreader",serif}
    *{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font-family:var(--sans);line-height:1.5}a{color:inherit}.shell{width:min(1200px,calc(100% - 32px));margin:auto;border-left:1px solid var(--line);border-right:1px solid var(--line)}
    header{min-height:72px;padding:0 24px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--line)}header a{text-decoration:none}.brand{font-weight:600;letter-spacing:-.03em}.back{font:10px var(--mono);text-transform:uppercase;letter-spacing:.06em;border-bottom:1px solid}
    .intro{padding:clamp(54px,10vw,130px) clamp(24px,7vw,90px);border-bottom:1px solid var(--line)}.eyebrow,.status{font:10px var(--mono);text-transform:uppercase;letter-spacing:.07em}.intro h1{max-width:900px;margin:18px 0 32px;font:400 clamp(64px,10vw,130px)/.86 var(--serif);letter-spacing:-.06em}.intro h1 em{color:var(--blue);font-weight:400}.intro p{max-width:560px;margin:0 0 0 auto;font-size:clamp(17px,2vw,23px);letter-spacing:-.02em}
    .project{display:grid;grid-template-columns:80px 1fr 190px;min-height:260px;border-bottom:1px solid var(--line)}.project>div{padding:28px}.project>div+div{border-left:1px solid var(--line)}.number{font:11px var(--mono)}.project h2{margin:18px 0 12px;font:400 clamp(38px,5vw,62px)/.95 var(--serif);letter-spacing:-.045em}.project p{max-width:590px;margin:0 0 28px}.status{display:flex;align-items:center;gap:8px}.status span{width:7px;height:7px;border-radius:50%;background:#8d8b83}.status.online span{background:#1d9c5a;box-shadow:0 0 0 4px rgba(29,156,90,.12)}.tags{display:flex;gap:7px;flex-wrap:wrap}.tags span{padding:4px 7px;border:1px solid;font:9px var(--mono);text-transform:uppercase}.actions{display:flex;flex-direction:column;justify-content:flex-end;gap:9px}.button{display:block;padding:11px 13px;border:1px solid;text-decoration:none;font:10px var(--mono);text-transform:uppercase;text-align:center}.button.primary{background:var(--blue);border-color:var(--blue);color:white}
    footer{padding:28px;display:flex;justify-content:space-between;background:var(--ink);color:var(--paper);font:10px var(--mono);text-transform:uppercase;letter-spacing:.05em}
    @media(max-width:700px){.shell{width:100%;border:0}.project{grid-template-columns:48px 1fr}.project>div{padding:20px 14px}.actions{grid-column:2;border-top:1px solid var(--line)}.intro{padding:60px 18px}.intro p{margin-left:0}footer{flex-direction:column;gap:10px}}
  </style>
</head>
<body>
  <main class="shell">
    <header><a class="brand" href="../">Archive Tracker</a><a class="back" href="../">Back to portfolio</a></header>
    <section class="intro"><div class="eyebrow">Project Lab / Experiments in public</div><h1>Code you can<br><em>actually open.</em></h1><p>Small tools, working prototypes, and ongoing experiments. Live demos are isolated from the main site and may change as I learn.</p></section>
    <section id="lab-list">${renderLabCards(projects)}</section>
    <footer><span>Built in public by Omid Abduli</span><span id="lab-count">${renderLabCount(projects)}</span></footer>
  </main>
  ${renderPageData(settings, projects)}
  <script type="module">
    import { refreshFromGitHub, renderLabCards, renderLabCount } from "../assets/projects.js";
    refreshFromGitHub((projects) => {
      document.getElementById("lab-list").innerHTML = renderLabCards(projects);
      document.getElementById("lab-count").textContent = renderLabCount(projects);
    });
  </script>
</body>
</html>`;
}

async function fillTemplates(directory, values) {
  for (const entry of await readdir(directory, { recursive: true, withFileTypes: true })) {
    if (!entry.isFile() || !templateExtensions.has(extname(entry.name))) continue;
    const file = join(entry.parentPath, entry.name);
    const content = await readFile(file, "utf8");
    const filled = Object.entries(values).reduce((text, [key, value]) => text.replaceAll(key, value), content);
    if (filled !== content) await writeFile(file, filled, "utf8");
  }
}

export async function build() {
  const siteUrl = getSiteUrl();
  const { settings, projects } = await loadProjects();

  await rm(outputDirectory, { recursive: true, force: true });
  // Dotfiles are skipped, matching what actions/upload-pages-artifact publishes.
  await cp(publicDirectory, outputDirectory, { recursive: true, filter: (source) => !basename(source).startsWith(".") });
  await fillTemplates(outputDirectory, {
    "%SITE_URL%": siteUrl.href,
    "%BASE_PATH%": siteUrl.pathname,
    "<!-- work-rows -->": renderWorkRows(projects),
    "<!-- archive-data -->": renderPageData(settings, projects)
  });

  await mkdir(join(outputDirectory, "projects"), { recursive: true });
  await writeFile(join(outputDirectory, "projects", "index.html"), renderProjectLab(settings, projects), "utf8");

  await mkdir(join(outputDirectory, "api"), { recursive: true });
  await writeFile(join(outputDirectory, "api", "project-lab.json"), JSON.stringify(projects), "utf8");

  console.log(`Built Archive Tracker for ${siteUrl.href} with ${projects.length} projects into dist/`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await build();
}
