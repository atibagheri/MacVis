# 1) Build the React app
FROM node:20 AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
ARG REACT_APP_API_BASE
ARG PUBLIC_URL
ENV REACT_APP_API_BASE=${REACT_APP_API_BASE}
ENV PUBLIC_URL=${PUBLIC_URL}
RUN npm run build

# 2) Serve with nginx
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/build /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
