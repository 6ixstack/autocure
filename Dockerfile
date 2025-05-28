# Multi-stage build for AutoCure AI Platform

# Stage 1: Build client
FROM node:18-alpine AS client-build
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install --legacy-peer-deps
COPY client/ .
RUN npm run build

# Stage 2: Build server
FROM node:18-alpine AS server-build
WORKDIR /app/server
COPY server/package*.json ./
RUN npm install
COPY server/ .

# Stage 3: Production image
FROM node:18-alpine AS production
WORKDIR /app

# Install production dependencies
COPY server/package*.json ./
RUN npm ci --only=production

# Copy built assets
COPY --from=client-build /app/client/build ./public
COPY --from=server-build /app/server .

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S autocure -u 1001

# Set ownership
USER autocure

# Expose port
EXPOSE 5001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:5001/api/health || exit 1

# Start the application
CMD ["node", "simple-server.js"]