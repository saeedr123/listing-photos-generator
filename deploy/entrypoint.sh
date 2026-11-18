#!/bin/sh
# Container start: apply migrations, make sure the first admin and the
# reference data exist, then start the web app. Each step is safe to run
# on every start.
set -e
cd "$(dirname "$0")/.."
node --version
npx prisma migrate deploy --schema prisma/schema.prisma
node scripts/db-setup.mjs
exec npm run start -w apps/web -- -p "${PORT:-3000}"
