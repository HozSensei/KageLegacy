# --- Build frontend (Vue / Vite) ---
FROM node:22-alpine AS frontend-build

WORKDIR /app/frontend

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ ./
# Vite alias @shared → ../shared (shared modules used by frontend build)
COPY shared/ /app/shared/
# Le moteur PvP partagé réutilise les modules purs de combat PvE.
COPY backend/src/services/deckCombat/ /app/backend/src/services/deckCombat/
COPY backend/src/services/characterAppearance.js /app/backend/src/services/characterAppearance.js

# Même origine : nginx proxy /api → API Node
ENV VITE_API_URL=
RUN npm run build

# --- Image de production ---
FROM node:22-alpine AS production

RUN apk add --no-cache nginx

WORKDIR /app

COPY backend/package.json backend/package-lock.json ./backend/
RUN npm ci --omit=dev --prefix backend

COPY backend/ ./backend/
# Backend imports ../../../../shared from src/services/pvp → /app/shared
COPY shared/ ./shared/
COPY --from=frontend-build /app/frontend/dist ./frontend/dist

COPY docker/nginx.conf /etc/nginx/http.d/default.conf
COPY docker/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 80

ENTRYPOINT ["/docker-entrypoint.sh"]
