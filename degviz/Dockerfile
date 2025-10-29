# ---------- Build stage ----------
    FROM node:20-bullseye AS build
    WORKDIR /app
    
    # Install OS-level tools that reduce memory pressure for CRA (e.g. swap support)
    RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
      && rm -rf /var/lib/apt/lists/*
    
    # Copy dependencies and install
    COPY package*.json ./
    RUN npm ci --no-audit --progress=false --include=dev
    
    # Copy source
    COPY . .
    
    # Environment tuning
    ENV NODE_OPTIONS="--max-old-space-size=8192" \
        GENERATE_SOURCEMAP="false" \
        TSC_COMPILE_ON_ERROR="true" \
        DISABLE_ESLINT_PLUGIN="true" \
        REACT_APP_API_BASE="/api"
    
    ARG PUBLIC_URL="/"
    ENV PUBLIC_URL="${PUBLIC_URL}"
    
    # Build React app
    RUN echo "⚙️  Building production React app..." && npm run build
    
    # ---------- Runtime stage ----------
    FROM nginx:1.29-alpine
    
    # Copy your custom Nginx config
    COPY nginx.conf /etc/nginx/conf.d/default.conf
    
    # Copy built React app from the build stage
    COPY --from=build /app/build /usr/share/nginx/html
    
    # Expose port and start
    EXPOSE 80
    CMD ["nginx", "-g", "daemon off;"]
    