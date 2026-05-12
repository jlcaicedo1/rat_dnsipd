FROM node:22-alpine AS base
WORKDIR /app
RUN apk add --no-cache openssl wget

FROM base AS deps
COPY package.json package-lock.json ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json
RUN npm ci --workspace backend --include-workspace-root

FROM deps AS development
ENV NODE_ENV=development
COPY backend backend
EXPOSE 3000
CMD ["npm", "--workspace", "backend", "run", "start:dev"]

FROM deps AS build
COPY backend backend
RUN npm --workspace backend run prisma:generate
RUN npm --workspace backend run build

FROM build AS prod-deps
RUN npm prune --omit=dev --workspace backend --include-workspace-root

FROM base AS production
ENV NODE_ENV=production
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --from=prod-deps --chown=appuser:appgroup /app/node_modules ./node_modules
COPY --from=prod-deps --chown=appuser:appgroup /app/package.json ./package.json
COPY --from=prod-deps --chown=appuser:appgroup /app/backend/package.json ./backend/package.json
COPY --from=build --chown=appuser:appgroup /app/backend/dist ./backend/dist
COPY --from=build --chown=appuser:appgroup /app/backend/prisma ./backend/prisma

USER appuser
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=5 \
  CMD wget -qO- http://127.0.0.1:3000/api/health >/dev/null || exit 1

CMD ["node", "backend/dist/src/main.js"]
