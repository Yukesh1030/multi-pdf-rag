
from pathlib import Path
from functools import lru_cache
from typing import List

from fastembed import TextEmbedding
from langchain_chroma import Chroma
from langchain_core.documents import Document

from ingestion import load_pdf, split_documents


# Project paths
PROJECT_DIR = Path(__file__).resolve().parent.parent
UPLOADS_DIR = PROJECT_DIR / "uploads"
DB_DIRECTORY = PROJECT_DIR / "data" / "chroma_db"

DB_DIRECTORY.mkdir(parents=True, exist_ok=True)

COLLECTION_NAME = "multi_pdf_knowledge_base"
EMBEDDING_MODEL = "BAAI/bge-small-en-v1.5"


@lru_cache(maxsize=1)
def get_embedding_model():
    """
    Load the embedding model only when embeddings are first required.
    Cache one model instance to avoid loading it repeatedly.
    """
    print(f"Loading embedding model: {EMBEDDING_MODEL}")
    return TextEmbedding(model_name=EMBEDDING_MODEL)


class FastEmbedFunction:
    """Embedding adapter compatible with LangChain Chroma."""

    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        model = get_embedding_model()
        return [vector.tolist() for vector in model.embed(texts)]

    def embed_query(self, text: str) -> List[float]:
        model = get_embedding_model()
        return next(model.query_embed(text)).tolist()


# Chroma can initialize without loading the embedding model.
vector_store = Chroma(
    collection_name=COLLECTION_NAME,
    embedding_function=FastEmbedFunction(),
    persist_directory=str(DB_DIRECTORY),
)


def index_chunks(chunks: List[Document]) -> int:
    """Replace previously indexed chunks for the same PDF sources."""

    if not chunks:
        return 0

    sources = {
        chunk.metadata["source"]
        for chunk in chunks
        if chunk.metadata.get("source")
    }

    for source in sources:
        vector_store.delete(where={"source": source})

    vector_store.add_documents(chunks)

    return len(chunks)


def delete_document_chunks(source: str) -> int:
    """Delete only the ChromaDB chunks matching one PDF filename."""
    matches = vector_store.get(
        where={"source": source},
        include=[],
    )

    ids = matches.get("ids", [])

    if ids:
        vector_store.delete(ids=ids)

    return len(ids)



def search_chunks(question: str, k: int = 4) -> List[Document]:
    """Find relevant chunks using semantic similarity."""

    if not question.strip():
        return []

    return vector_store.similarity_search(
        query=question,
        k=k,
    )


def index_uploaded_pdfs() -> int:
    """Index PDFs currently stored in the uploads directory."""

    pdf_files = sorted(UPLOADS_DIR.glob("*.pdf"))
    total_chunks = 0

    for pdf_file in pdf_files:
        print(f"Processing PDF: {pdf_file.name}")

        pages = load_pdf(str(pdf_file))
        chunks = split_documents(pages)
        indexed = index_chunks(chunks)

        total_chunks += indexed

        print(f"Pages extracted: {len(pages)}")
        print(f"Chunks indexed: {indexed}")

    print(f"Total chunks indexed: {total_chunks}")
    return total_chunks


if __name__ == "__main__":
    index_uploaded_pdfs()

    while True:
        question = input(
            "\nAsk a question about your PDFs (or type 'exit'): "
        ).strip()

        if question.lower() in {"exit", "quit"}:
            break

        if not question:
            continue

        results = search_chunks(question)

        for result in results:
            print(
                f"\nSource: {result.metadata.get('source', 'Unknown')}"
                f"\nPage: {result.metadata.get('page', 'Unknown')}"
                f"\n{result.page_content}"
            )
