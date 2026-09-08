# API FastAPI — déploiement Render / Docker (contexte = racine du dépôt)
# Frontend Next.js : service séparé, Root Directory = frontend, Dockerfile = Dockerfile

FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    curl \
    fonts-dejavu-core \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY backend /app

EXPOSE 8000

ENV RUNNING_IN_DOCKER=true
ENV PYTHONUNBUFFERED=1

# Render injecte PORT (souvent 10000)
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
