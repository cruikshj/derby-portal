FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

RUN npm run build

# Production dependencies only
RUN npm ci --omit=dev

FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/migrations ./migrations

# Uploaded photos live here; mount a volume at /app/uploads to keep them
RUN mkdir -p /app/uploads /app/exports && chown -R node:node /app

USER node

EXPOSE 5000

CMD ["node", "--enable-source-maps", "dist/index.cjs"]
