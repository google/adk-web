FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npx ng build --configuration production

FROM nginx:1.27-alpine
COPY --from=build /app/dist/agent_framework_web/browser /usr/share/nginx/html
EXPOSE 8080
