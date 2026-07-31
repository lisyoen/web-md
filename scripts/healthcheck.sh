#!/usr/bin/env bash
set -euo pipefail

project_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$project_dir"

python3 -c "import json; json.load(open('extension/manifest.json', encoding='utf-8'))"
required_files=(
  extension/manifest.json extension/background.js extension/content.js
  extension/lib/turndown.js extension/lib/turndown-plugin-gfm.js
  extension/lib/extractor.js extension/lib/converter.js
  extension/icons/icon16.png extension/icons/icon48.png extension/icons/icon128.png
  updater/host.ps1 updater/host.bat updater/install-updater.bat updater/update.bat
  publish/latest.json
)
for file in "${required_files[@]}"; do
  test -f "$file"
done

bash scripts/build.sh
diff -q src/extractor.js extension/lib/extractor.js
diff -q src/converter.js extension/lib/converter.js
diff -q src/version.js extension/lib/version.js
diff -r extension publish/extension
python3 - <<'PY'
import json

with open('extension/manifest.json', encoding='utf-8') as file:
    manifest = json.load(file)
with open('publish/latest.json', encoding='utf-8') as file:
    latest = json.load(file)
assert manifest['version'] == latest['version'], (
    f"version mismatch: {manifest['version']} != {latest['version']}"
)
PY
npm test
echo "Healthcheck PASS"
