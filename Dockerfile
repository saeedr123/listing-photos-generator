# Listing Photos Generator: production image.
#
# The web app reads repository files at run time (config/, the mockup
# registry and assets, and the Python JPG encoder in packages/export), so
# the image keeps the whole repository, not only the Next.js output.
#
# Needs: Node.js 22.18 or later (TypeScript type stripping, used by the
# setup script), Python 3 with Pillow (JPG encoding with the sRGB profile),
# DejaVu fonts (the template rasterizer), and OpenSSL (Prisma engines).

FROM node:22-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 python3-venv openssl ca-certificates fonts-dejavu-core \
  && rm -rf /var/lib/apt/lists/*
RUN python3 -m venv /opt/venv && /opt/venv/bin/pip install --no-cache-dir "pillow>=10,<13"
ENV PATH="/opt/venv/bin:$PATH" \
    NEXT_TELEMETRY_DISABLED=1

WORKDIR /app
COPY . .
RUN npm ci \
  && npx prisma generate --schema prisma/schema.prisma \
  && npm run build \
  && npm cache clean --force

ENV NODE_ENV=production \
    PORT=3000
EXPOSE 3000
ENTRYPOINT ["sh", "deploy/entrypoint.sh"]
