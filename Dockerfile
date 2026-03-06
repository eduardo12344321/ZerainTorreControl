# --- STAGE 1: Build Frontend ---
FROM node:22-slim AS frontend-builder
WORKDIR /app/frontend

# Force rebuild trigger
ENV FORCE_REBUILD=20260217_0007

# Build Arguments (Passed during docker build)
ARG VITE_GOOGLE_MAPS_API_KEY
ARG VITE_GOOGLE_CLIENT_ID
ARG VITE_API_BASE_URL

COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./

# Override or set .env from build args
RUN echo "VITE_GOOGLE_MAPS_API_KEY=$VITE_GOOGLE_MAPS_API_KEY" > .env && \
    echo "VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID" >> .env && \
    echo "VITE_API_BASE_URL=$VITE_API_BASE_URL" >> .env

RUN npm run build

# --- STAGE 2: Build Backend & Package ---
FROM python:3.11-slim
WORKDIR /app

# Install system dependencies (libpq-dev for PostgreSQL, curl for healthchecks)
# Removed libsqlcipher-dev as we are moving to PostgreSQL on GCP
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    pkg-config \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy backend requirements and install
COPY backend/requirements.txt ./backend/
RUN pip install --no-cache-dir -r backend/requirements.txt
# Ensure psycopg2-binary or psycopg2 is installed for Postgres
RUN pip install --no-cache-dir psycopg2-binary

# Copy backend code

# Copy backend code
COPY backend/ ./backend/

# CRITICAL: Remove ALL Python bytecode cache to prevent stale code
RUN find /app/backend -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
RUN find /app/backend -type f -name "*.pyc" -delete 2>/dev/null || true

# Copy built frontend from Stage 1 to a directory backend can serve
COPY --from=frontend-builder /app/frontend/dist ./backend/static/frontend/

# Set working directory to backend
WORKDIR /app/backend

# Environment variables
ENV PORT=8080
ENV PYTHONUNBUFFERED=TRUE
ENV PYTHONDONTWRITEBYTECODE=1
# DATABASE_URL will be provided by docker-compose

# Expose port
EXPOSE 8080

# Command to run
CMD ["python", "run_all.py"]
