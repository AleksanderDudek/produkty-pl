#!/usr/bin/env bash
# Builds the app for GitHub Pages and publishes dist/ as the `gh-pages` branch.
#
# Built HERE, not in GitHub Actions: the product data (public/data, ~24 MB)
# is generated from a multi-gigabyte Open Food Facts export and is not in the
# repository, so a CI build would have nothing to serve. Each deploy replaces
# the branch with a single commit, so 24 MB of data never piles up in history.
set -euo pipefail
cd "$(dirname "$0")/.."

if [[ ! -f public/data/products.json || ! -f public/data/manifest.json ]]; then
  echo "Brak public/data/products.json – najpierw: pnpm data" >&2
  exit 1
fi

REMOTE_URL=$(git remote get-url origin)
NAME=$(basename -s .git "$REMOTE_URL")
SOURCE=$(git rev-parse --short HEAD)

BASE_PATH="/$NAME/" pnpm build

# Pages has no rewrites: a deep link (/produkty-pl/dieta) opened before the
# service worker is installed gets 404.html, which is the app itself.
cp dist/index.html dist/404.html
# Not a Jekyll site: serve every file as it is.
touch dist/.nojekyll

cd dist
rm -rf .git
git init -q -b gh-pages
git add -A
git commit -q -m "Deploy $SOURCE" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push -q -f "$REMOTE_URL" gh-pages
rm -rf .git
echo "Opublikowano $SOURCE na gałęzi gh-pages."
