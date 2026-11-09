FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./
RUN npm ci
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ENV RUN_EXPIRY_WORKER=false
RUN npm run build

FROM node:24-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=build /app ./
RUN npm prune --omit=dev --ignore-scripts
USER node
EXPOSE 3000
CMD ["npm", "start"]
