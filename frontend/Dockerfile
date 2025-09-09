# syntax=docker/dockerfile:1

FROM node:20-alpine AS build
WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM nginx:alpine
# Copy static build assets
COPY --from=build /app/dist/ /usr/share/nginx/html/
# Nginx config with fallback to index.html for SPA
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
