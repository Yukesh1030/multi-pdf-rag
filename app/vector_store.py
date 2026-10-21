from pathlib import Path

from langchain_chroma import Chroma
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_core.documents import Document

# Import ingestion.py from the same app directory
from ingestion import load_pdf, split_documents


# Project paths
PROJECT_DIR = Path(__file__).resolve().parent.parent
UPLOADS_DIR = PROJECT_DIR / "uploads"
DB_DIRECTORY = PROJECT_DIR / "data" / "chroma_db"

DB_DIRECTORY.mkdir(parents=True, exist_ok=True)


# Embedding model converts text into numerical vectors
embeddings = HuggingFaceEmbeddings(
    model_name="sentence-transformers/all-MiniLM-L6-v2"
)


# Persistent ChromaDB vector store
vector_store = Chroma(
    collection_name="multi_pdf_knowledge_base",
    embedding_function=embeddings,
    persist_directory=str(DB_DIRECTORY),
)


def index_chunks(chunks: list[Document]) -> int:
    """Index chunks and replace existing chunks from the same PDF sources."""

    if not chunks:
        return 0

    sources = {
        chunk.metadata["source"]
        for chunk in chunks
        if chunk.metadata.get("source")
    }

    # Remove old records for each PDF before adding its latest chunks
    for source in sources:
        vector_store.delete(
            where={"source": source}
        )

    vector_store.add_documents(chunks)

    return len(chunks)


def search_chunks(
    question: str,
    k: int = 4,
) -> list[Document]:
    """Retrieve the most relevant document chunks for a question."""

    return vector_store.similarity_search(
        query=question,
        k=k,
    )


def index_uploaded_pdfs() -> int:
    """Extract, split, and index all PDFs in the uploads directory."""

    pdf_files = sorted(UPLOADS_DIR.glob("*.pdf"))

    if not pdf_files:
        print(f"No PDF files found in: {UPLOADS_DIR}")
        return 0

    total_chunks = 0

    for pdf_file in pdf_files:
        print(f"\nProcessing: {pdf_file.name}")

        # Step 1: Extract text from PDF pages
        pages = load_pdf(str(pdf_file))

        # Step 2: Split extracted text into smaller chunks
        chunks = split_documents(pages)

        # Step 3: Store chunk embeddings in ChromaDB
        indexed = index_chunks(chunks)

        total_chunks += indexed

        print(f"Pages extracted: {len(pages)}")
        print(f"Chunks indexed: {indexed}")

    print(f"\nTotal chunks indexed: {total_chunks}")

    return total_chunks


def main() -> None:
    """Run the PDF indexing and semantic search demonstration."""

    print("Multi-PDF Knowledge Base")
    print("=" * 40)

    # Index every PDF in uploads/
    index_uploaded_pdfs()

    # Ask a question after indexing
    question = input(
        "\nAsk a question about your PDFs: "
    ).strip()

    if not question:
        print("No question entered.")
        return

    # Retrieve relevant chunks
    results = search_chunks(question, k=4)

    print("\nRetrieved Context")
    print("=" * 40)

    if not results:
        print("No relevant chunks found.")
        return

    for rank, result in enumerate(results, start=1):
        print(f"\n--- Result {rank} ---")
        print("Source:", result.metadata.get("source", "Unknown"))
        print("Page:", result.metadata.get("page", "Unknown"))
        print("Text:", result.page_content)


if __name__ == "__main__":
    main()
