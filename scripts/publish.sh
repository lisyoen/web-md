#!/usr/bin/env bash
set -euo pipefail

project_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$project_dir"
bash scripts/healthcheck.sh
version="$(node -p "require('./package.json').version")"
mkdir -p publish
(cd extension && zip -qr "../publish/web-md-${version}.zip" .)
echo "Published web-md-${version}.zip"
