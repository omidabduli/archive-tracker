const express = require("express");
const fs = require("fs");
const http = require("http");
const path = require("path");
require("dotenv").config();

const app = express();
const port = process.env.PORT || process.env.port || 4000;
const publicDirectory = path.join(__dirname, "public");
const projectsFile = path.join(__dirname, "project-lab", "projects.json");

function loadProjects() {
  try {
    const parsed = JSON.parse(fs.readFileSync(projectsFile, "utf8"));
    return Array.isArray(parsed.projects) ? parsed.projects : [];
  } catch (error) {
    console.error("Could not load Project Lab manifest:", error.message);
    return [];
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function getProject(slug) {
  return loadProjects().find((project) => project.slug === slug);
}

function renderProjectLab(projects) {
  const cards = projects.map((project, index) => {
    const isLive = project.status === "live";
    const status = isLive ? "Live demo" : project.status === "planned" ? "Preparing demo" : "Source available";
    const liveLink = isLive
      ? `<a class="button primary" href="/projects/${escapeHtml(project.slug)}/">Open live &#xFE0E;↗</a>`
      : "";
    return `
      <article class="project">
        <div class="number">${String(index + 1).padStart(2, "0")}</div>
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

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Project Lab — Archive Tracker</title>
  <meta name="description" content="Live experiments and open-source projects by Omid Abduli.">
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
    <header><a class="brand" href="/">Archive Tracker</a><a class="back" href="/">Back to portfolio</a></header>
    <section class="intro"><div class="eyebrow">Project Lab / Experiments in public</div><h1>Code you can<br><em>actually open.</em></h1><p>Small tools, working prototypes, and ongoing experiments. Live demos are isolated from the main site and may change as I learn.</p></section>
    <section>${cards}</section>
    <footer><span>Built in public by Omid Abduli</span><span>${projects.length} repositories / ${projects.filter((item) => item.status === "live").length} live</span></footer>
  </main>
</body>
</html>`;
}

function proxyProject(request, response, project) {
  if (project.readOnly && !["GET", "HEAD", "OPTIONS"].includes(request.method)) {
    response.status(403).json({ error: "This public demo is read-only." });
    return;
  }

  const headers = {
    ...request.headers,
    host: `127.0.0.1:${project.port}`,
    "x-forwarded-host": request.headers.host || "localhost",
    "x-forwarded-proto": "https",
    "x-forwarded-prefix": `/projects/${project.slug}`
  };

  const proxyRequest = http.request({
    hostname: "127.0.0.1",
    port: project.port,
    path: request.originalUrl,
    method: request.method,
    headers
  }, (proxyResponse) => {
    response.writeHead(proxyResponse.statusCode || 502, proxyResponse.headers);
    proxyResponse.pipe(response);
  });

  proxyRequest.on("error", () => {
    if (!response.headersSent) {
      response.status(503).send(`<!doctype html><title>Demo starting</title><style>body{font:18px system-ui;max-width:680px;margin:15vh auto;padding:24px}</style><h1>This demo is not running yet.</h1><p>The project process may be starting or temporarily offline.</p><p><a href="/projects">Return to Project Lab</a></p>`);
    }
  });

  request.pipe(proxyRequest);
}

app.disable("x-powered-by");
app.use((request, response, next) => {
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  response.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  if (request.path === "/" || request.path.endsWith(".html") || request.path === "/projects") {
    response.setHeader("Cache-Control", "no-store, max-age=0");
  }
  next();
});

app.get(["/impressum", "/impressum/", "/impressum.html"], (request, response) => {
  response.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive, nosnippet");
  response.status(410).type("html").send(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Page Removed</title>
  <meta name="robots" content="noindex, nofollow, noarchive, nosnippet">
</head>
<body>
  <h1>410 - Page Permanently Removed</h1>
  <p>This page no longer exists.</p>
</body>
</html>`);
});

app.get(["/projects", "/projects/"], (request, response) => {
  response.type("html").send(renderProjectLab(loadProjects()));
});

app.get("/api/project-lab", (request, response) => {
  response.json(loadProjects().map(({ port: hiddenPort, ...project }) => project));
});

app.use("/projects/:slug", (request, response, next) => {
  const project = getProject(request.params.slug);
  if (!project || project.status !== "live" || !project.port) {
    next();
    return;
  }
  proxyProject(request, response, project);
});

app.use("/projects/:slug", (request, response) => {
  response.status(404).type("html").send(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Project not found — Archive Tracker</title>
  <style>body{margin:0;background:#f2efe7;color:#171714;font:18px system-ui;display:grid;min-height:100vh;place-items:center}main{max-width:620px;padding:32px}h1{font:400 clamp(48px,10vw,88px)/.95 Georgia,serif;letter-spacing:-.05em;margin:0 0 24px}a{color:#1648d8}</style>
</head>
<body><main><h1>Project not found.</h1><p>This demo is no longer available.</p><p><a href="/projects">See the current Project Lab</a></p></main></body>
</html>`);
});

app.use(express.static(publicDirectory, { etag: true, maxAge: 0 }));

app.get("*", (request, response) => {
  response.sendFile(path.join(publicDirectory, "index.html"));
});

const server = app.listen(port, "0.0.0.0", () => {
  console.log(`Archive Tracker is available at http://localhost:${port}`);
});

server.on("upgrade", (request, socket, head) => {
  const url = new URL(request.url, "http://localhost");
  const match = url.pathname.match(/^\/projects\/([a-z0-9-]+)(?:\/|$)/);
  const project = match ? getProject(match[1]) : null;

  if (!project || project.status !== "live" || !project.port) {
    socket.destroy();
    return;
  }

  const proxyRequest = http.request({
    hostname: "127.0.0.1",
    port: project.port,
    path: request.url,
    method: request.method,
    headers: {
      ...request.headers,
      host: `127.0.0.1:${project.port}`,
      "x-forwarded-host": request.headers.host || "localhost",
      "x-forwarded-proto": "https",
      "x-forwarded-prefix": `/projects/${project.slug}`
    }
  });

  proxyRequest.on("upgrade", (proxyResponse, proxySocket, proxyHead) => {
    const headerLines = Object.entries(proxyResponse.headers)
      .map(([name, value]) => `${name}: ${value}`)
      .join("\r\n");
    socket.write(`HTTP/1.1 101 Switching Protocols\r\n${headerLines}\r\n\r\n`);
    if (proxyHead.length) socket.write(proxyHead);
    if (head.length) proxySocket.write(head);
    proxySocket.pipe(socket);
    socket.pipe(proxySocket);
  });

  proxyRequest.on("error", () => socket.destroy());
  proxyRequest.end();
});
