#!/bin/bash

set -euo pipefail
cd "$(dirname "$0")"

REPOSITORY="${1:-}"
RUNTIME="${2:-}"
SLUG="${3:-}"

if [ -z "$REPOSITORY" ] || [ -z "$RUNTIME" ]; then
  echo "Usage: ./register-project.command <github-url> <flask|streamlit> [slug]"
  exit 1
fi

python3 project-lab/runtime/register_project.py \
  "$REPOSITORY" \
  "$RUNTIME" \
  project-lab/projects.json \
  "$SLUG"

echo ""
echo "Review the new description and safety settings in project-lab/projects.json."
echo "Then publish it with:"
echo "  ./deploy.command"
echo "  ./publish-project.command <slug-shown-above>"
