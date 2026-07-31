#!/usr/bin/env bash
set -euo pipefail

project_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$project_dir"

bash scripts/build.sh
npm test

rm -rf publish/extension
mkdir -p publish
cp -a extension publish/extension

version="$(python3 -c "import json; print(json.load(open('extension/manifest.json', encoding='utf-8'))['version'])")"
zip_path="publish/web-md-${version}.zip"
rm -f "$zip_path"
(cd publish && zip -qr "web-md-${version}.zip" extension)

published_at="$(TZ=Asia/Seoul date --iso-8601=seconds)"
python3 - "$version" "$published_at" <<'PY'
import json
import sys

latest = {
    'version': sys.argv[1],
    'releaseUrl': 'https://github.com/lisyoen/web-md/releases',
    'publishedAt': sys.argv[2],
}
with open('publish/latest.json', 'w', encoding='utf-8') as file:
    json.dump(latest, file, ensure_ascii=False, indent=2)
    file.write('\n')
PY

diff -r extension publish/extension
echo "Published version: ${version}"
echo "Zip: ${zip_path}"
echo "Verified: extension and publish/extension are identical"
