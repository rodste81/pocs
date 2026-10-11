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

# ---- Assinatura ----
# O macOS guarda as permissoes (Acessibilidade, Automacao) presas a assinatura do app.
# Com assinatura ad-hoc ela muda a cada build e as permissoes sao pedidas de novo.
# Por isso criamos, uma unica vez, um certificado proprio no chaveiro de login e
# assinamos sempre com ele: a identidade do app fica igual entre instalacoes.
# Se qualquer passo disso falhar, cai para a assinatura ad-hoc, que sempre funcionou.
IDENTITY="CLCL Local Signing"
KEYCHAIN="$HOME/Library/Keychains/login.keychain-db"

have_identity() { security find-identity -p codesigning "$KEYCHAIN" 2>/dev/null | grep -q "\"$IDENTITY\""; }

create_identity() {
  local tmp
  tmp="$(mktemp -d /tmp/clcl-cert.XXXXXX)" || return 1
  cat > "$tmp/cert.cnf" <<CNF
[ req ]
distinguished_name = dn
x509_extensions = ext
prompt = no
[ dn ]
CN = $IDENTITY
[ ext ]
basicConstraints = critical, CA:false
keyUsage = critical, digitalSignature
extendedKeyUsage = critical, codeSigning
CNF
  # /usr/bin/openssl (LibreSSL do macOS) gera um .p12 que o chaveiro aceita
  /usr/bin/openssl req -x509 -newkey rsa:2048 -nodes -days 3650 -config "$tmp/cert.cnf" \
    -keyout "$tmp/key.pem" -out "$tmp/cert.pem" >/dev/null 2>&1 || { rm -rf "$tmp"; return 1; }
  /usr/bin/openssl pkcs12 -export -inkey "$tmp/key.pem" -in "$tmp/cert.pem" -name "$IDENTITY" \
    -out "$tmp/id.p12" -passout pass:clcl >/dev/null 2>&1 || { rm -rf "$tmp"; return 1; }
  security import "$tmp/id.p12" -k "$KEYCHAIN" -P clcl -T /usr/bin/codesign >/dev/null 2>&1 || { rm -rf "$tmp"; return 1; }
  rm -rf "$tmp"
  have_identity
}

SIGNED_WITH="adhoc"
xattr -cr "$APP"
step "Assinando"
if have_identity; then
  echo "Certificado \"$IDENTITY\" encontrado no chaveiro."
elif create_identity; then
  echo "Certificado \"$IDENTITY\" criado no chaveiro de login (so nesta vez)."
else
  echo "Nao consegui criar o certificado; usando assinatura ad-hoc."
fi
if have_identity; then
  echo "Se o macOS perguntar se o codesign pode usar a chave, escolha \"Sempre Permitir\"."
  if codesign --force --deep --timestamp=none --sign "$IDENTITY" "$APP" && codesign --verify --deep "$APP"; then
    SIGNED_WITH="identity"
  else
    echo "A assinatura com o certificado falhou; usando assinatura ad-hoc."
  fi
fi
if [ "$SIGNED_WITH" = "adhoc" ]; then
  codesign --force --deep --sign - "$APP"
  codesign --verify --deep "$APP"
fi
echo "Assinatura: $SIGNED_WITH"

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

# Permissoes. Com assinatura ad-hoc a identidade muda a cada build: a permissao antiga
# fica na lista, ligada, mas nao vale mais, entao e zerada para o macOS pedir de novo.
# Com o certificado proprio a identidade e sempre a mesma: so zera na primeira vez
# (para descartar a permissao da assinatura antiga) e depois nao mexe mais.
MARK="$HOME/Library/Application Support/clcl-electron/.assinado-com-certificado"
RESET_TCC=1
if [ "$SIGNED_WITH" = "identity" ]; then
  if [ -f "$MARK" ]; then
    RESET_TCC=0
  else
    mkdir -p "$(dirname "$MARK")" && : > "$MARK"
  fi
else
  rm -f "$MARK"
fi
if [ "$RESET_TCC" = "1" ]; then
  step "Zerando as permissoes antigas do CLCL (Acessibilidade e Automacao)"
  tccutil reset Accessibility net.robotizze.clcl >/dev/null 2>&1 || true
  tccutil reset AppleEvents net.robotizze.clcl >/dev/null 2>&1 || true
else
  step "Permissoes mantidas (mesma assinatura da instalacao anterior)"
fi

step "Abrindo"
open "$DEST/CLCL.app"
sleep 2
if pgrep -x CLCL >/dev/null; then
  echo "OK: CLCL instalado em $DEST/CLCL.app e rodando (procure CLCL na barra de menus)."
  if [ "$RESET_TCC" = "1" ]; then
    echo "Libere o CLCL em Ajustes > Privacidade e Seguranca > Acessibilidade."
    [ "$SIGNED_WITH" = "identity" ] && echo "Com o certificado, esta e a ultima vez: as proximas instalacoes mantem a permissao."
  else
    echo "Nao precisa liberar nada: as permissoes da instalacao anterior continuam valendo."
  fi
else
  echo "*** O CLCL foi copiado para $DEST, mas nao ficou rodando. ***" >&2
  exit 1
fi
