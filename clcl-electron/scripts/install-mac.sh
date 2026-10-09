#!/bin/bash
# Compila, empacota e instala o CLCL.app em /Applications (macOS).
set -euo pipefail
cd "$(dirname "$0")/.."

step() { echo; echo "==> $*"; }
trap 'echo; echo "*** FALHOU no passo acima. O CLCL NAO foi instalado. ***" >&2' ERR

step "Instalando dependencias"
npm install

step "Compilando"
npm run build

# O pacote e montado fora do iCloud: arquivos dentro do iCloud Drive ganham
# atributos estendidos que fazem o codesign recusar o app.
OUT="$(mktemp -d /tmp/clcl-build.XXXXXX)"
step "Empacotando em $OUT"
npx electron-builder --dir -c.directories.output="$OUT"

APP="$(find "$OUT" -maxdepth 2 -name 'CLCL.app' | head -1)"
if [ -z "$APP" ]; then
  echo "CLCL.app nao foi gerado em $OUT" >&2
  exit 1
fi

step "Assinando (ad-hoc)"
xattr -cr "$APP"
codesign --force --deep --sign - "$APP"
codesign --verify --deep "$APP"

step "Fechando o CLCL que estiver aberto"
osascript -e 'tell application id "net.robotizze.clcl" to quit' >/dev/null 2>&1 || true
pkill -x CLCL >/dev/null 2>&1 || true
sleep 1

DEST="/Applications"
[ -w "$DEST" ] || { DEST="$HOME/Applications"; mkdir -p "$DEST"; }
step "Copiando para $DEST/CLCL.app"
rm -rf "$DEST/CLCL.app"
ditto "$APP" "$DEST/CLCL.app"
rm -rf "$OUT"

# A assinatura ad-hoc muda a cada build, e o macOS trata o app como outro: a
# permissao antiga fica na lista, ligada, mas nao vale mais. Zera para pedir de novo.
step "Zerando as permissoes antigas do CLCL (Acessibilidade e Automacao)"
tccutil reset Accessibility net.robotizze.clcl >/dev/null 2>&1 || true
tccutil reset AppleEvents net.robotizze.clcl >/dev/null 2>&1 || true

step "Abrindo"
open "$DEST/CLCL.app"
sleep 2
if pgrep -x CLCL >/dev/null; then
  echo "OK: CLCL instalado em $DEST/CLCL.app e rodando (procure CLCL na barra de menus)."
  echo "Libere o CLCL em Ajustes > Privacidade e Seguranca > Acessibilidade (uma vez por instalacao)."
else
  echo "*** O CLCL foi copiado para $DEST, mas nao ficou rodando. ***" >&2
  exit 1
fi
