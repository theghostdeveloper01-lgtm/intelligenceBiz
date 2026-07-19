# syntax=docker/dockerfile:1
#
# Build from the repo root:
#   docker build -f apps/api/Dockerfile -t intelligencebiz/api .

FROM node:22-slim AS base
RUN corepack enable
# git is required at install time: whatsapp-worker's Baileys dependency
# pulls `libsignal` directly from a GitHub repo rather than the npm
# registry, and it's part of this workspace's shared lockfile.
RUN apt-get update && apt-get install --yes --no-install-recommends git ca-certificates \
  && rm -rf /var/lib/apt/lists/*
RUN git config --global url."https://github.com/".insteadOf "git@github.com:"

# ---- Prune the workspace down to just this app + what it depends on ----
FROM base AS pruner
WORKDIR /app
RUN npm install --global turbo@^2
COPY . .
RUN turbo prune @intelligencebiz/api --docker

# ---- Install deps (cached separately from source) and build ----
FROM base AS builder
WORKDIR /app
COPY --from=pruner /app/out/json/ .
RUN pnpm install --frozen-lockfile
COPY --from=pruner /app/out/full/ .
# Not part of the workspace dependency graph turbo prune walks, so it
# has to be copied in separately.
COPY tsconfig.base.json ./tsconfig.base.json
RUN pnpm turbo run build --filter=@intelligencebiz/api

# ---- Runtime image ----
FROM base AS runner
WORKDIR /app
RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs nodejs
COPY --from=builder --chown=nodejs:nodejs /app .
USER nodejs
WORKDIR /app/apps/api
EXPOSE 3000
CMD ["node", "dist/main.js"]
