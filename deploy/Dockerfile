FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npx ng build --configuration production

FROM nginx:1.27-alpine
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
RUN sed -i '/^user /d' /etc/nginx/nginx.conf && \
    sed -i 's|pid .*|pid /tmp/nginx.pid;|' /etc/nginx/nginx.conf && \
    chown -R 101:0 /var/cache/nginx /var/log/nginx /etc/nginx/conf.d && \
    chmod -R g+w /var/cache/nginx /var/log/nginx /etc/nginx/conf.d
COPY --from=build /app/dist/agent_framework_web/browser /usr/share/nginx/html
USER 101
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
