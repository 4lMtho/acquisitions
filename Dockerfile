# syntax=docker/dockerfile:1

# --- Base image and common setup ---
FROM node:20-alpine AS base
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000

# Install packages needed for building native deps (kept minimal, removed in final)
RUN apk add --no-cache --virtual .build-deps python3 make g++

# --- Development image ---
FROM base AS dev
ENV NODE_ENV=development
# Copy only manifest first for better caching
COPY package*.json ./
# Install all deps including dev
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi
# Copy the rest of the source
COPY . .
# Default command for dev (overridden in compose)
CMD ["npm", "run", "dev"]

# --- Production image ---
FROM node:20-alpine AS prod
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000
# Copy only manifest first for better caching
COPY package*.json ./
# Install prod deps only
RUN if [ -f package-lock.json ]; then npm ci --omit=dev; else npm install --omit=dev; fi
# Copy app source
COPY ./src ./src
# If you have other runtime files (public/, migrations/, etc.), add COPY lines here

EXPOSE 3000
# Healthcheck (simple TCP check); adjust if you have a /health endpoint
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD wget -qO- http://localhost:${PORT}/health || exit 1

# Start the app
CMD ["npm", "start"]
