#!/bin/bash

set -euo pipefail

cd "$(dirname "$0")"

read_value() {
  sed -n "s/^$1=//p" .env | head -n 1
}

SITE_USER="$(read_value domain)"
SITE_PORT="$(read_value port)"
SITE_PASSWORD="$(read_value site-user-password)"
SITE_DOMAIN="$(read_value domain-name)"
SERVER_IP="$(read_value server-ip)"
REMOTE_PATH="/home/$SITE_USER/htdocs/$SITE_DOMAIN"
PM2_NAME="$SITE_USER"

if [[ ! "$SITE_USER" =~ ^[a-zA-Z0-9._-]+$ ]] ||
   [[ ! "$SITE_DOMAIN" =~ ^[a-zA-Z0-9.-]+$ ]] ||
   [[ ! "$SERVER_IP" =~ ^[0-9a-fA-F:.]+$ ]] ||
   [[ ! "$SITE_PORT" =~ ^[0-9]+$ ]] ||
   [[ -z "$SITE_PASSWORD" ]]; then
  echo "Deployment configuration in .env is incomplete or invalid."
  exit 1
fi

command -v sshpass >/dev/null || {
  echo "sshpass is required for this deployment."
  exit 1
}

command -v rsync >/dev/null || {
  echo "rsync is required for this deployment."
  exit 1
}

echo "Building Archive Tracker..."
npm install --ignore-scripts
npm run build
node --check server.js

echo "Checking the server..."
sshpass -p "$SITE_PASSWORD" ssh \
  -o StrictHostKeyChecking=no \
  -o ConnectTimeout=10 \
  "$SITE_USER@$SERVER_IP" \
  "test -d '$REMOTE_PATH'"

echo "Uploading the new site..."
sshpass -p "$SITE_PASSWORD" rsync -az --delete \
  --exclude='.env' \
  --exclude='.git' \
  --exclude='.agents' \
  --exclude='.openai' \
  --exclude='dist' \
  --exclude='node_modules' \
  --exclude='scripts' \
  --exclude='deploy.command' \
  --exclude='.DS_Store' \
  -e "ssh -o StrictHostKeyChecking=no" \
  ./ "$SITE_USER@$SERVER_IP:$REMOTE_PATH/"

echo "Installing dependencies and restarting the site..."
sshpass -p "$SITE_PASSWORD" ssh \
  -o StrictHostKeyChecking=no \
  "$SITE_USER@$SERVER_IP" "
    set -e
    export NVM_DIR=\"\$HOME/.nvm\"
    [ -s \"\$NVM_DIR/nvm.sh\" ] && . \"\$NVM_DIR/nvm.sh\"
    cd '$REMOTE_PATH'
    npm install --omit=dev --ignore-scripts
    pm2 delete '$SITE_DOMAIN' >/dev/null 2>&1 || true
    pm2 restart '$PM2_NAME' || pm2 start server.js --name '$PM2_NAME'
    pm2 save
    sleep 2
    pm2 describe '$PM2_NAME' >/dev/null
  "

echo "Deployment complete: https://$SITE_DOMAIN"
