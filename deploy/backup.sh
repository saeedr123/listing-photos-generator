#!/bin/sh
# Back up the database and the stored files (uploaded models, thumbnails,
# registry edits). Run on the server from the repository root, for example
# daily from cron. Keeps the files in ./backups; copy them off the server.
set -e
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p backups
docker compose -f deploy/docker-compose.yml --env-file deploy/.env exec -T db \
  sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom' > "backups/db-$STAMP.dump"
docker compose -f deploy/docker-compose.yml --env-file deploy/.env exec -T app \
  tar -C /data -czf - storage > "backups/storage-$STAMP.tar.gz"
echo "Backup written: backups/db-$STAMP.dump and backups/storage-$STAMP.tar.gz"
