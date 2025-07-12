#!/usr/bin/env bash
set -euo pipefail

if ! command -v node &> /dev/null; then
  echo "Ошибка: Node.js не установлен. Установите Node.js версии ≥ 20." >&2
  exit 1
fi

raw_version=$(node -v)
version=${raw_version#v}
major=${version%%.*}

if (( major < 20 )); then
  echo "Ошибка: требуется Node.js ≥ 20. Обнаружена версия $version." >&2
  exit 1
fi

cd /root/book-pulse

node ./index.js
