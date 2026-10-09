#!/bin/bash
# Compila, empacota e instala o CLCL.app em /Applications (macOS).
set -euo pipefail
cd "$(dirname "$0")/.."

npm install
npm run pack

APP="$(find release -maxdepth 2 -name 'CLCL.app' | head -1)"
if [ -z "$APP" ]; then
  echo "CLCL.app nao foi gerado em release/" >&2
  exit 1
fi

# assinatura ad-hoc (obrigatoria em Apple Silicon; sem conta de desenvolvedor)
codesign --force --deep --sign - "$APP"

osascript -e 'tell application "CLCL" to quit' >/dev/null 2>&1 || true
sleep 1
rm -rf /Applications/CLCL.app
ditto "$APP" /Applications/CLCL.app
open /Applications/CLCL.app
echo "Instalado em /Applications/CLCL.app"
