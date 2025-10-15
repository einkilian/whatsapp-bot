#!/usr/bin/env bash
set -euo pipefail

# Ensure project dir
cd /usr/src/app

# Use a local npm cache directory so we can mount it as a volume
export npm_config_cache=/usr/src/app/.npm

# If node_modules is empty or missing, install dependencies
if [ ! -d "node_modules" ] || [ -z "$(ls -A node_modules 2>/dev/null || true)" ]; then
  echo "node_modules not found or empty — installing dependencies..."
  # Prefer npm ci when package-lock.json is present
  if [ -f package-lock.json ]; then
    npm ci --only=production
  else
    npm install --only=production
  fi
else
  echo "node_modules present — skipping install"
fi

# Exec the command
exec "$@"
