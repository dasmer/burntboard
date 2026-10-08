FROM node:22-bookworm-slim
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund
COPY server.mjs prototype-server.mjs index.html client.js client.css favicon.svg demo-agent.md ./
COPY server ./server
COPY skills ./skills
COPY images ./images
ENV HOST=0.0.0.0 PORT=8080 APP_ENV=production
EXPOSE 8080
CMD ["node", "server.mjs"]
