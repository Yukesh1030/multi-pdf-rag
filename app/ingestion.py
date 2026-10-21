from pathlib import Path

from pypdf import PdfReader
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter


def load_pdf(file_path: str) -> list[Document]:
    """Extract each PDF page into a LangChain Document."""

    pdf_path = Path(file_path)
    reader = PdfReader(str(pdf_path))

    documents = []

    for page_number, page in enumerate(reader.pages, start=1):
        text = page.extract_text() or ""

        if text.strip():
            document = Document(
                page_content=text,
                metadata={
                    "source": pdf_path.name,
                    "page": page_number,
                },
            )

            documents.append(document)

    return documents

def split_documents(
        documents:list[Document],
        chunk_size:int=500,
        chunk_overlap:int=80,
)->list[Document]:
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=chunk_size, chunk_overlap=chunk_overlap)
    return text_splitter.split_documents(documents)

if __name__ == "__main__":
# #if __name__ == "__main__":
# Ensures the code inside this block runs only when executing this script directly (python app/ingestion.py),
# and not when imported into another file (like main.py).
    pdf_file = Path("uploads/sample.pdf")

    if not pdf_file.exists():
        print(f"PDF not found: {pdf_file}")
    else:
          pages = load_pdf(str(pdf_file))
          chunks = split_documents(pages)
  
          print(f"Pages extracted: {len(pages)}")
          print(f"Chunks created: {len(chunks)}")
  
          for index, chunk in enumerate(chunks[:5], start=1):
            print(f"\n--- CHUNK {index} ---")
            print("Metadata:", chunk.metadata)
            print("Characters:", len(chunk.page_content))
            print("Text:", chunk.page_content[:250])