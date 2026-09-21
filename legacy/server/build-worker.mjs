import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { extname, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = resolve(root, "public");
const outputDirectory = resolve(root, "dist/server");

const mimeTypes = {
  ".html": "text/html; charset=UTF-8",
  ".txt": "text/plain; charset=UTF-8",
  ".xml": "application/xml; charset=UTF-8",
  ".svg": "image/svg+xml; charset=UTF-8",
  ".png": "image/png",
  ".ico": "image/x-icon"
};

const entries = await readdir(publicDir);
const files = {};

for (const name of entries) {
  const filePath = resolve(publicDir, name);
  const ext = extname(name).toLowerCase();
  const type = mimeTypes[ext] || "application/octet-stream";
  
  if (ext === ".png" || ext === ".ico") {
    const buf = await readFile(filePath);
    files["/" + name] = { body: buf.toString("base64"), isBase64: true, type };
  } else {
    const content = await readFile(filePath, "utf8");
    files["/" + name] = { body: content, isBase64: false, type };
  }
}

if (files["/index.html"]) {
  files["/"] = files["/index.html"];
}

await rm(resolve(root, "dist"), { recursive: true, force: true });
await mkdir(outputDirectory, { recursive: true });

const worker = `const files = ${JSON.stringify(files)};

export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (["/impressum", "/impressum/", "/impressum.html"].includes(url.pathname)) {
      return new Response("<!doctype html><html><head><meta name=\\"robots\\" content=\\"noindex, nofollow, noarchive, nosnippet\\"></head><body><h1>410 - Page Permanently Removed</h1></body></html>", {
        status: 410,
        headers: {
          "Content-Type": "text/html; charset=UTF-8",
          "X-Robots-Tag": "noindex, nofollow, noarchive, nosnippet",
          "Cache-Control": "no-store, max-age=0"
        }
      });
    }
    const file = files[url.pathname] || files["/"];
    const body = file.isBase64 ? Uint8Array.from(atob(file.body), c => c.charCodeAt(0)) : file.body;
    return new Response(request.method === "HEAD" ? null : body, {
      status: 200,
      headers: {
        "Content-Type": file.type,
        "Cache-Control": url.pathname === "/" ? "public, max-age=300" : "public, max-age=3600",
        "X-Content-Type-Options": "nosniff",
        "Referrer-Policy": "strict-origin-when-cross-origin",
        "Permissions-Policy": "camera=(), microphone=(), geolocation=()"
      }
    });
  }
};
`;

await writeFile(resolve(outputDirectory, "index.js"), worker, "utf8");
console.log("Built Archive Tracker for deployment.");
