# Nada de secretos aquí: JWT_SECRET / credenciales AWS / passwords se inyectan en
# runtime (docker-compose env_file o AWS Secrets Manager, ver backend/src/config/
# load-secrets.ts), nunca como --build-arg. Un build-arg queda grabado en las capas
# de la imagen (visible con `docker history`) aunque no aparezca en el Dockerfile.
ARG NODE_ENV=production
ARG BUILD_VERSION=dev

FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma
RUN npm ci

COPY tsconfig*.json nest-cli.json ./
COPY src ./src
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app

ARG NODE_ENV
ARG BUILD_VERSION
ENV NODE_ENV=${NODE_ENV}
LABEL org.opencontainers.image.version=${BUILD_VERSION}

COPY package*.json ./
COPY prisma ./prisma
RUN npm ci --omit=dev && npx prisma generate

COPY --from=builder /app/dist ./dist
COPY scripts ./scripts

EXPOSE 4000
CMD ["node", "scripts/entrypoint.js"]
