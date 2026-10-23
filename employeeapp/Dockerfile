FROM node:22-slim AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

ARG VITE_DATADOG_APPLICATION_ID
ARG VITE_DATADOG_CLIENT_TOKEN

ENV VITE_DATADOG_APPLICATION_ID=$VITE_DATADOG_APPLICATION_ID
ENV VITE_DATADOG_CLIENT_TOKEN=$VITE_DATADOG_CLIENT_TOKEN

RUN npm run build

FROM nginx:alpine AS runtime

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
