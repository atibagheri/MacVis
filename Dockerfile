
FROM node:18 AS react-builder

WORKDIR /app/degviz

# Copy React app source code
COPY degviz/ .

# Copy package.json into the working directory
COPY package*.json .  # Note the dot instead of /app/

RUN npm install && npm run build

# ---------- Stage 2: Python + R Backend ----------
FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

# Step 1: Base packages
RUN apt-get update && apt-get install -y \
    python3 python3-pip \
    r-base \
    git \
    curl

# Step 2: R system libraries
RUN apt-get install -y --no-install-recommends \
    libcurl4-openssl-dev \
    libssl-dev \
    libxml2-dev \
    libfreetype6 \
    libharfbuzz0b \
    libfribidi0 \
    libjpeg-dev

# Step 3: Install Plumber
RUN R -e "install.packages('plumber', repos='https://cloud.r-project.org/')"

# Step 4: Set working dir and copy everything
WORKDIR /app
COPY . .

# Step 5: Install Python deps
RUN pip3 install -r backend/requirements.txt

# Step 6: Copy React build into backend
COPY --from=react-builder /app/degviz/build /app/degviz/build

# Step 7: Expose and launch
RUN chmod +x start.sh
EXPOSE 8000 5050
CMD ["./start.sh"]
