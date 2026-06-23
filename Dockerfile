# Stage 1: Build
FROM node:20-alpine AS build
WORKDIR /app

# Instalar dependencias necesarias para NX/Angular
RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm ci

COPY . .

# Compilar la aplicación kofix-ejecucion con el perfil de Calidad (Quality)
RUN npx nx build kofix-ejecucion --configuration=quality

# Stage 2: Servidor Web de Producción (Nginx)
FROM nginx:stable-alpine
COPY --from=build /app/dist/apps/kofix-ejecucion/browser /usr/share/nginx/html

# Plantilla de configuración básica de Nginx para Angular (SPA Routing)
COPY <<-'EOF' /etc/nginx/conf.d/default.conf
server {
    listen 80;
    server_name localhost;

    location / {
        root /usr/share/nginx/html;
        index index.html index.htm;
        try_files $uri $uri/ /index.html;
    }

    error_page 500 502 503 504 /50x.html;
    location = /50x.html {
        root /usr/share/nginx/html;
    }
}
EOF

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
