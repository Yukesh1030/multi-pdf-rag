
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PIP_NO_CACHE_DIR=1

WORKDIR /app

# Required for common Python packages and PDF processing
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN python -m pip install --upgrade pip \
    && python -m pip install -r requirements.txt

COPY app/ ./app/

# Create persistent-data directories inside the container
RUN mkdir -p /app/data /app/uploads

EXPOSE 8000

CMD ["sh", "-c", "uvicorn main:app --app-dir app --host 0.0.0.0 --port ${PORT:-8000}"]
