#!/bin/bash

set -euo pipefail
cd "$(dirname "$0")"

SLUG="${1:-}"
if [[ ! "$SLUG" =~ ^[a-z0-9-]+$ ]]; then
  echo "Usage: ./publish-project.command <project-slug>"
  exit 1
fi

read_value() {
  sed -n "s/^$1=//p" .env | head -n 1
}

SITE_USER="$(read_value domain)"
SITE_PASSWORD="$(read_value site-user-password)"
SITE_DOMAIN="$(read_value domain-name)"
SERVER_IP="$(read_value server-ip)"
MANIFEST="project-lab/projects.json"

CONFIG="$(python3 project-lab/runtime/read_config.py "$SLUG" "$MANIFEST")"

IFS='|' read -r REPOSITORY BRANCH RUNTIME PROJECT_PORT ENTRYPOINT PROJECT_MODULE PROJECT_APP_OBJECT <<< "$CONFIG"
APP_ROOT="/home/$SITE_USER/apps/$SLUG"
SOURCE_DIR="$APP_ROOT/source"
VENV_DIR="$APP_ROOT/venv"
PM2_NAME="project-$SLUG"
PROJECT_PREFIX="/projects/$SLUG"
REPOSITORY="${REPOSITORY%.git}.git"
UV_BIN="/home/$SITE_USER/.local/bin/uv"

echo "Preparing $SLUG on the server..."
sshpass -p "$SITE_PASSWORD" ssh -o StrictHostKeyChecking=no "$SITE_USER@$SERVER_IP" \
  "mkdir -p '$APP_ROOT/runtime'"

sshpass -p "$SITE_PASSWORD" rsync -az \
  -e "ssh -o StrictHostKeyChecking=no" \
  project-lab/runtime/ "$SITE_USER@$SERVER_IP:$APP_ROOT/runtime/"

echo "Updating source and installing dependencies..."
sshpass -p "$SITE_PASSWORD" ssh -o StrictHostKeyChecking=no "$SITE_USER@$SERVER_IP" "
  set -e
  if [ -d '$SOURCE_DIR/.git' ]; then
    git -C '$SOURCE_DIR' fetch origin '$BRANCH'
    git -C '$SOURCE_DIR' reset --hard 'origin/$BRANCH'
  else
    git clone --depth 1 --branch '$BRANCH' '$REPOSITORY' '$SOURCE_DIR'
  fi
  if [ ! -x '$UV_BIN' ]; then
    mkdir -p '/home/$SITE_USER/.local/bin'
    curl -LsSf https://astral.sh/uv/install.sh -o '$APP_ROOT/runtime/install-uv.sh'
    UV_INSTALL_DIR='/home/$SITE_USER/.local/bin' UV_NO_MODIFY_PATH=1 sh '$APP_ROOT/runtime/install-uv.sh'
  fi
  '$UV_BIN' venv --clear --python python3 '$VENV_DIR'
  '$UV_BIN' pip install --python '$VENV_DIR/bin/python' -r '$SOURCE_DIR/requirements.txt'

  if [ '$RUNTIME' = 'flask' ]; then
    '$UV_BIN' pip install --python '$VENV_DIR/bin/python' gunicorn
  fi
  '$VENV_DIR/bin/python' '$APP_ROOT/runtime/prepare_project.py' '$SLUG' '$SOURCE_DIR'
"

echo "Starting isolated runtime..."
if [ "$RUNTIME" = "streamlit" ]; then
  REMOTE_START="
    pm2 delete '$PM2_NAME' >/dev/null 2>&1 || true
    pm2 start '$VENV_DIR/bin/streamlit' --name '$PM2_NAME' --cwd '$SOURCE_DIR' --interpreter none -- \
      run '$ENTRYPOINT' \
      --server.address 127.0.0.1 \
      --server.port '$PROJECT_PORT' \
      --server.baseUrlPath 'projects/$SLUG' \
      --server.maxUploadSize 25 \
      --server.headless true \
      --browser.gatherUsageStats false
  "
elif [ "$RUNTIME" = "flask" ]; then
  REMOTE_START="
    pm2 delete '$PM2_NAME' >/dev/null 2>&1 || true
    PROJECT_SOURCE='$SOURCE_DIR' \
    PROJECT_MODULE='$PROJECT_MODULE' \
    PROJECT_APP_OBJECT='$PROJECT_APP_OBJECT' \
    PROJECT_PREFIX='$PROJECT_PREFIX' \
    pm2 start '$VENV_DIR/bin/gunicorn' --name '$PM2_NAME' --cwd '$APP_ROOT/runtime' --interpreter none -- \
      --bind '127.0.0.1:$PROJECT_PORT' --workers 1 --threads 4 --timeout 180 flask_mount:application
  "
else
  echo "Unsupported live runtime: $RUNTIME"
  exit 1
fi

sshpass -p "$SITE_PASSWORD" ssh -o StrictHostKeyChecking=no "$SITE_USER@$SERVER_IP" "
  set -e
  export NVM_DIR=\"\$HOME/.nvm\"
  [ -s \"\$NVM_DIR/nvm.sh\" ] && . \"\$NVM_DIR/nvm.sh\"
  $REMOTE_START
  pm2 save
  sleep 4
  curl -fsS 'http://127.0.0.1:$PROJECT_PORT$PROJECT_PREFIX/' >/dev/null
"

echo "Published: https://$SITE_DOMAIN$PROJECT_PREFIX/"
