FROM node:22.22.3-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:1.28-alpine
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist/megaten-fusion-tool/browser/ /usr/share/nginx/html/
EXPOSE 8080
