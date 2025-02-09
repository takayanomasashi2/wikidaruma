# Dockerfile
FROM node:20-slim

# Install FFmpeg and clean up
RUN apt-get update && \
    apt-get install -y ffmpeg && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package.json ./
COPY prisma ./prisma/
COPY tsconfig.json ./
COPY src ./src/

# Install all dependencies (including devDependencies for TypeScript build)
RUN npm install

# Generate Prisma Client
RUN npx prisma generate

# Build TypeScript
RUN npm run build

# Clean up dev dependencies
RUN npm prune --production

# Expose the port
EXPOSE 8080

# Start the server
CMD ["node", "dist/index.js"]