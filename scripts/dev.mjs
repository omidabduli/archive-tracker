import { watch } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "./build.mjs";
import { startPreview } from "./preview.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

let queue = Promise.resolve();
const rebuild = () => {
  queue = queue.then(build).catch((error) => console.error(`Build failed: ${error.message}`));
  return queue;
};

await rebuild();
startPreview();

// Rebuild when content changes; `node --watch` restarts this script when the
// build or preview code itself changes.
let timer;
for (const directory of ["public", "project-lab"]) {
  watch(resolve(root, directory), { recursive: true }, () => {
    clearTimeout(timer);
    timer = setTimeout(rebuild, 100);
  });
}
