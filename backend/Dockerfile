# syntax=docker/dockerfile:1

# --- base: python runtime with system deps for PDF and image handling ---
FROM python:3.11-slim AS base
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# System dependencies for Playwright
RUN apt-get update && \
    DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
      curl \
      ca-certificates && \
    rm -rf /var/lib/apt/lists/*

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /bin/uv

WORKDIR /app

# Install Python deps with uv
COPY backend/requirements.txt ./backend/requirements.txt
RUN uv pip install --system --no-cache -r backend/requirements.txt

# Copy source
COPY backend/ ./backend/

# Make start script executable
RUN chmod +x ./backend/start.sh

# Create non-root user and switch to it
RUN useradd -ms /bin/bash appuser
USER appuser

# Install Playwright browsers as the appuser (after switching users)
RUN python -m playwright install --with-deps chromium

EXPOSE 8001

# Default to uvicorn in production
ENV ENVIRONMENT=production \
    HOST=0.0.0.0 \
    PORT=8001

# Use startup script
CMD ["./backend/start.sh"]
