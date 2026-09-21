import json
import sys

slug, path = sys.argv[1:]
projects = json.load(open(path, encoding="utf-8"))["projects"]
project = next((item for item in projects if item["slug"] == slug), None)

if not project:
    raise SystemExit(f"Unknown project slug: {slug}")
if project.get("status") != "live":
    raise SystemExit(f"{slug} is not marked live in the manifest")

fields = [
    project["repository"],
    project.get("branch", "main"),
    project["runtime"],
    str(project["port"]),
    project.get("entrypoint", ""),
    project.get("module", "app"),
    project.get("appObject", "app"),
]
print("|".join(fields))
