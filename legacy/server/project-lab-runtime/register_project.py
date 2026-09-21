import json
import re
import sys
from pathlib import Path
from urllib.parse import urlparse

repository, runtime, manifest_path, requested_slug = sys.argv[1:]
parsed = urlparse(repository)

if parsed.scheme != "https" or parsed.netloc != "github.com":
    raise SystemExit("Use a full public GitHub URL such as https://github.com/omidabduli/my-project")

parts = [part for part in parsed.path.strip("/").split("/") if part]
if len(parts) != 2 or parts[0].lower() != "omidabduli":
    raise SystemExit("The repository must belong to the omidabduli GitHub account")
if runtime not in {"flask", "streamlit"}:
    raise SystemExit("Runtime must be either flask or streamlit")

repository_name = parts[1].removesuffix(".git")
raw_slug = requested_slug or repository_name
slug = re.sub(r"[^a-z0-9]+", "-", raw_slug.lower()).strip("-")
if not slug:
    raise SystemExit("Could not create a valid project slug")

path = Path(manifest_path)
manifest = json.loads(path.read_text(encoding="utf-8"))
projects = manifest["projects"]
if any(item["slug"] == slug for item in projects):
    raise SystemExit(f"The slug {slug} is already registered")
if any(item["repository"].rstrip("/").removesuffix(".git") == repository.rstrip("/").removesuffix(".git") for item in projects):
    raise SystemExit("That GitHub repository is already registered")

used_ports = [item.get("port", 4100) for item in projects if item.get("port")]
port = max([4100, *used_ports]) + 1
if port > 4199:
    raise SystemExit("No free Project Lab port remains in the 4101–4199 range")

project = {
    "slug": slug,
    "name": repository_name.replace("-", " ").replace("_", " ").title(),
    "description": "A small learning project published from GitHub.",
    "repository": f"https://github.com/omidabduli/{repository_name}",
    "branch": "main",
    "runtime": runtime,
    "port": port,
    "status": "live",
    "readOnly": False,
    "tags": ["Python", "Learning"],
}
if runtime == "streamlit":
    project["entrypoint"] = "app.py"
else:
    project["module"] = "app"
    project["appObject"] = "app"

projects.append(project)
path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
print(f"Registered {slug} on port {port}")
