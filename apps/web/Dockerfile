# syntax=docker/dockerfile:1
#
# Build from the repo root:
#   docker build -f apps/web/Dockerfile \
#     --build-arg NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co \
#     --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=anon-key \
#     -t intelligencebiz/web .
#
# NEXT_PUBLIC_* vars are inlined into the client bundle at build time —
# they have to be build args, not just runtime env vars.

FROM node:22-slim AS base
RUN corepack enable
# git is required at install time: whatsapp-worker's Baileys dependency
# pulls `libsignal` directly from a GitHub repo, and it's part of this
# workspace's shared lockfile.
RUN apt-get update && apt-get install --yes --no-install-recommends git ca-certificates \
  && rm -rf /var/lib/apt/lists/*
RUN git config --global url."https://github.com/".insteadOf "git@github.com:"

# ---- Prune the workspace down to just this app + what it depends on ----
FROM base AS pruner
WORKDIR /app
RUN npm install --global turbo@^2
COPY . .
RUN turbo prune @intelligencebiz/web --docker

# ---- Install deps (cached separately from source) and build ----
FROM base AS builder
WORKDIR /app
COPY --from=pruner /app/out/json/ .
RUN pnpm install --frozen-lockfile
COPY --from=pruner /app/out/full/ .
# Not part of the workspace dependency graph turbo prune walks, so it
# has to be copied in separately.
COPY tsconfig.base.json ./tsconfig.base.json

ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY

RUN pnpm turbo run build --filter=@intelligencebiz/web

# ---- Runtime image ----
# .next/standalone bundles a minimal server.js + pruned node_modules; the
# monorepo-relative path is preserved (apps/web/...), and static assets /
# public/ aren't included by standalone output, so they're copied in too.
#
# This stage intentionally starts from a clean node:22-slim rather than
# `base`: `base` runs `corepack enable`, which installs pnpm/yarn shims
# into the image's PATH. Everything the app needs at runtime is already
# in node_modules from the builder stage, so no package manager should
# be reachable here at all — if anything ever tries to invoke `pnpm`
# (e.g. a platform Start Command override), it should fail outright
# instead of corepack silently trying to download/initialize pnpm and
# writing to a cache dir it doesn't have permission for.
FROM node:22-slim AS runner
WORKDIR /app
# --create-home: without it, /home/nodejs never exists, and anything
# that tries to write under $HOME (npm/corepack caches, etc.) fails
# with EACCES. Belt-and-braces alongside removing the shims below.
RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --create-home --uid 1001 --gid nodejs nodejs
# Fully disable corepack and delete its pnpm/yarn shims so there is no
# package manager left in PATH — COREPACK_ENABLE=0 alone only stops
# corepack from acting as npm's package-manager gatekeeper, it doesn't
# remove the `pnpm`/`pnpx`/`yarn`/`yarnpkg` shim binaries themselves.
RUN corepack disable \
  && rm -f /usr/local/bin/corepack /usr/local/bin/pnpm /usr/local/bin/pnpx \
    /usr/local/bin/yarn /usr/local/bin/yarnpkg
ENV COREPACK_ENABLE=0
COPY --from=builder --chown=nodejs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nodejs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=nodejs:nodejs /app/apps/web/public ./apps/web/public
USER nodejs
ENV HOME=/home/nodejs
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
