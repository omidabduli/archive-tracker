import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { dirname, extname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { getSiteUrl } from "./build.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const distDirectory = resolve(root, "dist");

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".webmanifest": "application/manifest+json"
};

async function isFile(path) {
  return (await stat(path).catch(() => null))?.isFile() ?? false;
}

async function isDirectory(path) {
  return (await stat(path).catch(() => null))?.isDirectory() ?? false;
}

function send(request, response, status, file, headers = {}) {
  response.writeHead(status, {
    "Content-Type": mimeTypes[extname(file).toLowerCase()] || "application/octet-stream",
    "Cache-Control": "no-cache",
    ...headers
  });
  if (request.method === "HEAD") return response.end();
  createReadStream(file).pipe(response);
}

// Serves dist/ below the site's base path with GitHub Pages' rules: directory
// URLs redirect to a trailing slash, "/page" falls back to "page.html", and
// anything missing gets 404.html with a 404 status.
export function startPreview() {
  const siteUrl = getSiteUrl();
  const basePath = siteUrl.pathname;
  const port = Number(process.env.PORT) || Number(siteUrl.port) || 4000;

  const server = createServer(async (request, response) => {
    const url = new URL(request.url, "http://localhost");
    let pathname;
    try {
      pathname = decodeURIComponent(url.pathname);
    } catch {
      response.writeHead(400).end("Bad request");
      return;
    }

    if (!pathname.startsWith(basePath)) {
      if (pathname === "/" || `${pathname}/` === basePath) {
        response.writeHead(301, { Location: basePath }).end();
      } else {
        response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }).end("Not found (outside the site base path)");
      }
      return;
    }

    const target = resolve(distDirectory, `.${sep}${pathname.slice(basePath.length)}`);
    if (target !== distDirectory && !target.startsWith(distDirectory + sep)) {
      response.writeHead(403).end("Forbidden");
      return;
    }

    if (await isDirectory(target)) {
      if (!pathname.endsWith("/")) {
        response.writeHead(301, { Location: `${url.pathname}/${url.search}` }).end();
        return;
      }
      const index = join(target, "index.html");
      if (await isFile(index)) return send(request, response, 200, index);
    } else if (await isFile(target)) {
      return send(request, response, 200, target);
    } else if (!extname(target) && await isFile(`${target}.html`)) {
      return send(request, response, 200, `${target}.html`);
    }

    const notFound = join(distDirectory, "404.html");
    if (await isFile(notFound)) return send(request, response, 404, notFound);
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }).end("Not found");
  });

  server.listen(port, () => {
    console.log(`Preview running at http://localhost:${port}${basePath}`);
  });
  return server;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  startPreview();
}
