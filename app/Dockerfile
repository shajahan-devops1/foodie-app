FROM node:20.20.2-alpine3.22 AS builder
WORKDIR /app

# Copy lockfile along with package.json
COPY package*.json ./
COPY *.js ./

# Use npm ci to strictly enforce fixed dependency versions from package-lock.json
RUN npm ci --only=production

FROM node:20.20.2-alpine3.22
WORKDIR /app
EXPOSE 8080
ENV MONGO="true" \
    MONGO_URL="mongodb://mongodb:27017/catalogue"

RUN apk update && apk upgrade --no-cache && \
    addgroup -S roboshop && adduser -S -G roboshop roboshop && \
    chown -R roboshop:roboshop /app

COPY --from=builder /app /app
USER roboshop
CMD ["node", "src/server.js"]