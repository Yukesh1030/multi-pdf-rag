# Multi-PDF RAG Knowledge Base

A full-stack Retrieval-Augmented Generation (RAG) application that lets users upload PDF documents and ask natural-language questions about their contents. The application retrieves relevant document chunks and generates answers grounded in the uploaded content, with source citations.

## Features

- Upload and process PDF documents
- Extract text and split it into overlapping chunks
- Generate embeddings using Sentence Transformers
- Store and retrieve document chunks using ChromaDB
- Generate answers using the Groq API
- Return source information, including PDF filename and page number
- FastAPI backend with interactive Swagger documentation
- React frontend
- Dockerized backend with persistent storage for indexed documents

## Tech Stack

**Frontend:** React, Vite, JavaScript, CSS

**Backend:** Python, FastAPI, Uvicorn

**RAG:** LangChain, Sentence Transformers, ChromaDB, Groq API

**PDF Processing:** pypdf

**Deployment and Environment:** Docker, Docker Compose, environment variables

## Architecture

1. The user uploads a PDF through the frontend.
2. The backend extracts text from the PDF.
3. Text is split into overlapping chunks.
4. An embedding model converts chunks into vectors.
5. ChromaDB stores the vectors and document metadata.
6. The user submits a question.
7. Relevant chunks are retrieved from ChromaDB.
8. The language model generates an answer using the retrieved context.
9. The API returns the answer and available source citations.

## Project Structure

```text
multi-pdf-rag/
├── app/
│   ├── __init__.py
│   ├── main.py
│   ├── ingestion.py
│   ├── vector_store.py
│   └── rag.py
├── frontend/
├── data/                 # Local ChromaDB storage; not committed
├── uploads/              # Local uploaded PDFs; not committed
├── .dockerignore
├── .gitignore
├── Dockerfile
├── compose.yaml
├── requirements.txt
└── README.md
```

## Prerequisites

- Python 3.12 or another compatible Python environment
- Docker Desktop with Linux containers enabled
- Node.js and npm for the frontend
- A Groq API key

## Environment Configuration

Create a `.env` file in the project root:

```env
GROQ_API_KEY=your_groq_api_key
```

Never commit your real `.env` file or expose your API key.

## Run with Docker

From the project root:

```powershell
docker compose build api
docker compose up -d api
docker compose ps
```

Check the API:

- Health endpoint: http://127.0.0.1:8000/
- Swagger documentation: http://127.0.0.1:8000/docs

Stop the service:

```powershell
docker compose down
```

The Compose configuration mounts local `data` and `uploads` directories so application data can persist across container restarts.

## Run the Frontend

Open a separate terminal:

```powershell
cd frontend
npm install
npm run dev
```

Open the local URL printed by Vite, usually http://localhost:5173.

Ensure the backend is running before uploading PDFs or asking questions.

## API Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/` | API health check |
| POST | `/upload` | Upload and index a PDF |
| POST | `/ask` | Ask a question about indexed documents |

## Current Limitations

- Answers depend on the quality of extracted PDF text and retrieved chunks.
- Scanned PDFs may require OCR, which is not currently documented as implemented.
- The application requires a valid Groq API key for model responses.
- The current Docker Compose setup containerizes the backend; the frontend runs separately.

## Future Improvements

- Add automated tests and structured logging
- Improve retrieval quality and document-level filtering
- Add file-size limits and stronger upload validation
- Add user authentication and access controls
- Deploy the frontend and backend to cloud hosting
- Add monitoring and evaluation for RAG answer quality

## License

Choose and add a license before distributing this project publicly.
