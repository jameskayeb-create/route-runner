# --- Build stage ---
FROM node:20-alpine AS builder
WORKDIR /app

# Install build dependencies for better-sqlite3 (native module)
RUN apk add --no-cache python3 make g++

COPY package.json package-lock.json* ./
RUN npm install

COPY . .
RUN npm run build

# --- Production stage ---
FROM node:20-alpine
WORKDIR /app

# Install runtime dependencies for better-sqlite3
RUN apk add --no-cache python3 make g++

COPY package.json package-lock.json* ./
RUN npm install --omit=dev
# Rebuild native modules for this container
RUN npm rebuild better-sqlite3

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/seed.ts ./seed.ts
COPY --from=builder /app/seed-data.json ./seed-data.json

# Create data directory for persistent volume mount
RUN mkdir -p /data

# Default env vars
ENV NODE_ENV=production
ENV DATABASE_PATH=/data/database.sqlite
ENV PORT=3000

EXPOSE 3000

# Start script: seed DB if it doesn't exist, then start server
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

CMD ["./docker-entrypoint.sh"]
