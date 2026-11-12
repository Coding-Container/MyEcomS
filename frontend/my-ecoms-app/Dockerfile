# Build Stage
FROM node:22.20.0-alpine3.22 AS builder

WORKDIR /app
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

COPY package*.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build


# Production Stage
FROM nginxinc/nginx-unprivileged:1.28.2-alpine3.23

COPY nginx.conf /etc/nginx/conf.d/default.conf

COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]