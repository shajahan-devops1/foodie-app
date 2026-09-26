# ---- Build stage ----
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev

# ---- Runtime stage ----
FROM node:20-alpine
RUN addgroup -S app && adduser -S app -G app
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY package*.json ./
COPY src ./src
USER app
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s CMD node -e "require('http').get('http://127.0.0.1:4000/api/health',res=>process.exit(res.statusCode===200?0:1)).on('error',()=>process.exit(1))"
CMD ["node", "src/server.js"]
