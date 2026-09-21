import pathlib
import sys

slug = sys.argv[1]
source = pathlib.Path(sys.argv[2])

patches = {}

for relative_path, replacements in patches.get(slug, {}).items():
    path = source / relative_path
    content = path.read_text(encoding="utf-8")
    for before, after in replacements:
        content = content.replace(before, after)
    path.write_text(content, encoding="utf-8")
