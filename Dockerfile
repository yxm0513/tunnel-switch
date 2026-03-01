FROM docker.m.daocloud.io/library/node:18-slim

RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    ca-certificates \
    unzip \
    libglib2.0-0 \
    libnss3 \
    libgbm1 \
    libasound2 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libxrender1 \
    libx11-xcb1 \
    libxcb1 \
    chromium \
    --no-install-recommends

WORKDIR /app
COPY package.json ./
RUN npm install puppeteer-core
COPY . .
RUN mkdir -p test/screenshots

WORKDIR /app/test

CMD ["node", "test-switch.js"]
