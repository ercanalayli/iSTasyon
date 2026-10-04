#!/bin/sh
set -eu

echo "== Apeiron iSH hazırlığı =="

apk update
apk add nodejs npm curl ca-certificates git

export NODE_OPTIONS=--jitless
npm config set fund false >/dev/null 2>&1 || true
npm config set audit false >/dev/null 2>&1 || true

npm install -g --no-audit --no-fund @google/clasp@2.4.2

grep -q 'NODE_OPTIONS=--jitless' /root/.profile 2>/dev/null || echo 'export NODE_OPTIONS=--jitless' >> /root/.profile

echo
echo "== Sürümler =="
node --version
npm --version
clasp --version
echo
echo "APEIRON_ISH_READY"
