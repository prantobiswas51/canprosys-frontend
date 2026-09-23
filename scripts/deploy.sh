#!/usr/bin/env bash
# Deploy workflow for this frontend: pull latest code, install, rebuild.
# Nginx serves straight out of dist/, so there's no process to restart --
# once the new build lands in dist/, Nginx is already serving it on the
# next request.
#
# Setup (run once):
#   chmod +x scripts/deploy.sh
#
# Usage (from the server, inside the frontend directory):
#   ./scripts/deploy.sh

set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$APP_DIR"

echo "[$(date)] Pulling latest code..."
git pull

echo "[$(date)] Installing dependencies..."
npm ci

echo "[$(date)] Building..."
npm run build

echo "[$(date)] Deploy done -- dist/ updated, Nginx is serving it."
