
from pathlib import Path
import shutil
import re

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from ingestion import load_pdf, split_documents
from vector_store import index_chunks, delete_document_chunks
from rag import answer_question


PROJECT_DIR = Path(__file__).resolve().parent.parent
UPLOADS_DIR = PROJECT_DIR / "uploads"
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI(
    title="Multi-PDF RAG API",
    description="Upload PDFs, manage documents, and ask questions using RAG.",
    version="1.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://multi-pdf-rag-five.vercel.app",
    ],
    allow_credentials=False,
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)


class AskRequest(BaseModel):
    question: str


@app.get("/")
def home():
    return {
        "message": "Multi-PDF RAG API is running",
        "docs": "/docs",
        "endpoints": ["/upload", "/ask", "/documents"],
    }


@app.get("/documents")
def list_documents():
    """List PDFs currently present in the uploads directory."""
    documents = []

    for pdf_path in sorted(UPLOADS_DIR.glob("*.pdf")):
        if pdf_path.is_file():
            documents.append({
                "name": pdf_path.name,
                "size_bytes": pdf_path.stat().st_size,
            })

    return {
        "documents": documents,
        "count": len(documents),
    }


@app.delete("/documents/{filename}")
def delete_document(filename: str):
    """Delete one uploaded PDF and only its associated ChromaDB chunks."""
    if (
        not filename
        or filename in {".", ".."}
        or Path(filename).name != filename
        or "/" in filename
        or "\\" in filename
        or not filename.lower().endswith(".pdf")
    ):
        raise HTTPException(
            status_code=400,
            detail="Invalid PDF filename.",
        )

    destination = UPLOADS_DIR / filename

    # Confirm the resolved file remains inside uploads/.
    if destination.resolve().parent != UPLOADS_DIR.resolve():
        raise HTTPException(
            status_code=400,
            detail="Invalid document path.",
        )

    if not destination.is_file():
        raise HTTPException(
            status_code=404,
            detail="PDF not found in the uploads directory.",
        )

    try:
        # Remove matching vectors before removing the source PDF.
        deleted_chunks = delete_document_chunks(filename)
        destination.unlink()

        return {
            "message": "PDF and its indexed chunks deleted successfully.",
            "filename": filename,
            "chunks_deleted": deleted_chunks,
        }

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Could not delete the PDF: {error}",
        ) from error


@app.post("/upload")
def upload_pdf(file: UploadFile = File(...)):
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=400,
            detail="Only PDF files are supported.",
        )

    safe_name = Path(file.filename).name
    safe_name = re.sub(r"[^A-Za-z0-9._-]", "_", safe_name)
    destination = UPLOADS_DIR / safe_name

    try:
        with destination.open("wb") as output:
            shutil.copyfileobj(file.file, output)

        pages = load_pdf(str(destination))

        if not pages:
            destination.unlink(missing_ok=True)
            raise HTTPException(
                status_code=400,
                detail="No extractable text found in this PDF.",
            )

        chunks = split_documents(pages)

        if not chunks:
            destination.unlink(missing_ok=True)
            raise HTTPException(
                status_code=400,
                detail="No text chunks could be created.",
            )

        indexed = index_chunks(chunks)

        return {
            "message": "PDF uploaded and indexed successfully",
            "filename": safe_name,
            "pages_extracted": len(pages),
            "chunks_indexed": indexed,
        }

    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"PDF processing failed: {error}",
        ) from error
    finally:
        file.file.close()


@app.post("/ask")
def ask_question(request: AskRequest):
    question = request.question.strip()

    if not question:
        raise HTTPException(
            status_code=400,
            detail="Question cannot be empty.",
        )

    try:
        return answer_question(question)
    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Question answering failed: {error}",
        ) from error


if __name__ == "__main__":
    import os
    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.environ.get("PORT", "8000")),
        app_dir="app",
    )
