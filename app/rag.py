import os
from pathlib import Path

from dotenv import load_dotenv
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate

from vector_store import search_chunks

PROJECT_DIR = Path(__file__).resolve().parent.parent
load_dotenv(PROJECT_DIR / ".env")

api_key = os.getenv("GROQ_API_KEY")

if not api_key:
    raise RuntimeError(
        "GROQ_API_KEY is missing. Add it to the project's .env file."
    )

llm = ChatGroq(
    model="openai/gpt-oss-120b",
    temperature=0,
    api_key=api_key,
)

prompt = ChatPromptTemplate.from_template(
    """
You are a helpful document question-answering assistant.

Answer the question using ONLY the context below.
If the answer is not present in the context, say:
"I could not find that information in the uploaded documents."

Do not invent skills, experience, facts, or citations.

Context:
{context}

Question:
{question}

Give a clear, concise answer. Cite supporting sources using
the provided source filename and page number.
"""
)


def answer_question(question: str) -> dict:
    """Retrieve relevant PDF passages and generate a grounded answer."""

    documents = search_chunks(question, k=4)

    if not documents:
        return {
            "question": question,
            "answer": "I could not find relevant information in the uploaded documents.",
            "sources": [],
        }

    context_parts = []
    sources = []

    for document in documents:
        source = document.metadata.get("source", "Unknown")
        page = document.metadata.get("page", "Unknown")

        context_parts.append(
            f"[Source: {source}, Page: {page}]\n"
            f"{document.page_content}"
        )

        citation = {"source": source, "page": page}
        if citation not in sources:
            sources.append(citation)

    context = "\n\n".join(context_parts)

    messages = prompt.format_messages(
        context=context,
        question=question,
    )

    response = llm.invoke(messages)

    return {
        "question": question,
        "answer": response.content,
        "sources": sources,
    }


if __name__ == "__main__":
    print("Multi-PDF RAG Question Answering")
    print("=" * 40)

    while True:
        question = input("\nAsk a question (or type 'exit'): ").strip()

        if question.lower() in {"exit", "quit"}:
            print("Goodbye!")
            break

        if not question:
            print("Please enter a question.")
            continue

        try:
            result = answer_question(question)

            print("\nAnswer:")
            print(result["answer"])

            print("\nSources:")
            for source in result["sources"]:
                print(
                    f"- {source['source']}, "
                    f"page {source['page']}"
                )

        except Exception as error:
            print(f"\nError generating answer: {error}")