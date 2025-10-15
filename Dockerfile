# Use official Node.js LTS image
FROM node:18-bullseye-slim

# Install necessary packages for puppeteer / chromium
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libc6 \
    libcairo2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgdk-pixbuf2.0-0 \
    libnspr4 \
    libnss3 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    wget \
  && rm -rf /var/lib/apt/lists/*

# Optional: install chromium (useful so you don't need to provide CHROME_PATH)
RUN apt-get update && apt-get install -y chromium && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /usr/src/app

# Copy package files first to leverage docker cache
COPY package*.json ./

# Copy source
COPY . .

# Copy entrypoint script which will install dependencies at container start
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Expose port
EXPOSE 3001

# Ensure session dir exists and is writable (LocalAuth will create subdirs)
RUN mkdir -p /usr/src/app/session /usr/src/app/.npm /usr/src/app/node_modules \
  && chown -R root:root /usr/src/app/session /usr/src/app/.npm /usr/src/app/node_modules \
  && chmod -R 0777 /usr/src/app/session /usr/src/app/.npm /usr/src/app/node_modules

# Default CHROME_PATH points to system chromium
ENV CHROME_PATH=/usr/bin/chromium
ENV SESSION_PATH=/usr/src/app/session

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["node", "index.js"]
