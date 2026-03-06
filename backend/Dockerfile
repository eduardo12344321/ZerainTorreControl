# Use official Python lightweight image
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies (needed for some python packages and sqlite)
RUN apt-get update && apt-get install -y \
    build-essential \
    libsqlcipher-dev \
    pkg-config \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first to leverage Docker cache
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application
COPY . .

# Create directory for SQLite database persistence (if using volume mounts)
RUN mkdir -p /app/data

# Environment variables
ENV PORT=8080
ENV PYTHONUNBUFFERED=TRUE

# Expose the Cloud Run default port
EXPOSE 8080

# Command to run the Master Script (API + Bot)
CMD ["python", "run_all.py"]
