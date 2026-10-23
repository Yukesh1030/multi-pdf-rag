
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PIP_NO_CACHE_DIR=1
ENV PORT=10000

WORKDIR /app

COPY requirements.txt .

RUN python -m pip install --upgrade pip \
    && python -m pip install -r requirements.txt

COPY app/ ./app/

RUN mkdir -p /app/data/chroma_db /app/uploads

EXPOSE 10000

CMD ["sh", "-c", "uvicorn main:app --app-dir app --host 0.0.0.0 --port ${PORT:-10000}"]
