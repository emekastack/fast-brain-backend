# Development stage
FROM node:22-alpine AS development

# Install system dependencies
RUN apk add --no-cache \
    ca-certificates \
    curl \
    wget \
    unzip \
    python3 \
    make \
    g++

WORKDIR /app

# Copy package files from package.json and package-lock.json
COPY package*.json ./

# Install all dependencies (including dev dependencies)
RUN npm install

# Copy application code
COPY . .

# Expose application port
EXPOSE 8000

# Start development server with hot reload
CMD ["npm", "run", "dev"]

# Build stage - creates optimized production build
FROM node:22-alpine AS build

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including devDependencies for build)
RUN npm ci

# Copy application source
COPY . .

# Build TypeScript application
RUN npm run build

# Production stage - minimal final image
FROM node:22-alpine AS production

# Install runtime dependencies only
RUN apk add --no-cache \
    ca-certificates \
    curl \
    wget \
    tini

WORKDIR /app

ENV NODE_ENV=production

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --omit=dev

# Copy built application from build stage
COPY --from=build /app/dist ./dist

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose application port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:8000/ || exit 1

# Use tini to handle signals properly
ENTRYPOINT ["/sbin/tini", "--"]

# Start application
CMD ["node", "dist/index.js"]