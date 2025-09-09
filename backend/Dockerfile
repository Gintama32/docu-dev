# syntax=docker/dockerfile:1

# --- base: python runtime with system deps for PDF and image handling ---
FROM python:3.11-slim AS base
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# System dependencies for WeasyPrint and general build
RUN apt-get update && \
    DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
      build-essential \
      libpango-1.0-0 \
      libcairo2 \
      libffi-dev \
      libgdk-pixbuf-2.0-0 \
      libxml2 \
      libxslt1.1 \
      shared-mime-info \
      fonts-liberation \
      curl && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python deps
COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy source
COPY backend/ ./backend/

# Make start script executable
RUN chmod +x ./backend/start.sh

# Non-root user (optional)
RUN useradd -ms /bin/bash appuser
USER appuser

EXPOSE 8001

# Default to uvicorn in production
ENV ENVIRONMENT=production \
    HOST=0.0.0.0 \
    PORT=8001

# Use startup script
CMD ["./backend/start.sh"]
