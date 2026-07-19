# syntax=docker/dockerfile:1
#
# Build from the repo root:
#   docker build -f apps/whatsapp-worker/Dockerfile -t intelligencebiz/whatsapp-worker .
#
# node:22-slim (glibc, not alpine) — sharp is a transitive dependency and
# its prebuilt binaries are far less friction on glibc than musl.

FROM node:22-slim AS base
RUN corepack enable
# git is required at install time: Baileys pulls its `libsignal` dependency
# directly from a GitHub repo rather than the npm registry.
RUN apt-get update && apt-get install --yes --no-install-recommends git ca-certificates \
  && rm -rf /var/lib/apt/lists/*
# The libsignal-node dependency is pinned to a git+ssh URL in the
# lockfile; rewrite it to anonymous HTTPS so cloning it doesn't require
# an SSH key baked into the image.
RUN git config --global url."https://github.com/".insteadOf "git@github.com:"

# ---- Prune the workspace down to just this app + what it depends on ----
FROM base AS pruner
WORKDIR /app
RUN npm install --global turbo@^2
COPY . .
RUN turbo prune @intelligencebiz/whatsapp-worker --docker

# ---- Install deps (cached separately from source) and build ----
FROM base AS builder
WORKDIR /app
# turbo prune's out/json/ has package.json files only, so this layer is
# only invalidated when a dependency changes, not on every source edit.
COPY --from=pruner /app/out/json/ .
RUN pnpm install --frozen-lockfile
COPY --from=pruner /app/out/full/ .
# Not part of the workspace dependency graph turbo prune walks, so it
# has to be copied in separately.
COPY tsconfig.base.json ./tsconfig.base.json
RUN pnpm turbo run build --filter=@intelligencebiz/whatsapp-worker

# ---- Runtime image ----
FROM base AS runner
WORKDIR /app
RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs nodejs
COPY --from=builder --chown=nodejs:nodejs /app .
USER nodejs
WORKDIR /app/apps/whatsapp-worker
CMD ["node", "dist/index.js"]
