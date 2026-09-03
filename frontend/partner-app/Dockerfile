FROM node:22-alpine AS build
WORKDIR /build
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npx ng build --configuration production

FROM nginx:alpine
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
ENV API_GATEWAY_URL=http://api-gateway:8080
COPY --from=build /build/dist/partner-app/browser /usr/share/nginx/html
EXPOSE 80
