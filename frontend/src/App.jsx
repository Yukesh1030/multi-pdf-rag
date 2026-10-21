import { useEffect, useRef, useState } from "react";
import {
  Bot,
  FileText,
  Upload,
  Send,
  Plus,
  Trash2,
  LoaderCircle,
  Sparkles,
  PanelLeftClose,
  PanelLeftOpen,
  AlertCircle,
} from "lucide-react";
import "./App.css";

const API_URL = "http://127.0.0.1:8000";

export default function App() {
  const [documents, setDocuments] = useState([]);
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Welcome! Upload a PDF and ask me questions about its contents. I'll use your document knowledge base to find relevant information.",
      sources: [],
    },
  ]);
  const [question, setQuestion] = useState("");
  const [uploading, setUploading] = useState(false);
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState("");
  const [apiOnline, setApiOnline] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetch(`${API_URL}/`)
      .then((response) => setApiOnline(response.ok))
      .catch(() => setApiOnline(false));
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, asking]);

  async function uploadFiles(event) {
    const files = Array.from(event.target.files || []);
    event.target.value = "";

    if (!files.length) return;

    setError("");

    for (const file of files) {
      if (!file.name.toLowerCase().endsWith(".pdf")) {
        setError(`${file.name} is not a PDF. Please select PDF files only.`);
        continue;
      }

      setUploading(true);

      try {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch(`${API_URL}/upload`, {
          method: "POST",
          body: formData,
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.detail || "PDF upload failed.");
        }

        setDocuments((previous) => [
          ...previous.filter((item) => item.name !== data.filename),
          {
            name: data.filename,
            pages: data.pages_extracted,
            chunks: data.chunks_indexed,
          },
        ]);

        setMessages((previous) => [
          ...previous,
          {
            role: "assistant",
            content: `Successfully indexed ${data.filename}: ${data.pages_extracted} pages and ${data.chunks_indexed} chunks. You can now ask questions about your documents.`,
            sources: [],
          },
        ]);
      } catch (err) {
        setError(err.message || "Unable to upload the PDF.");
      } finally {
        setUploading(false);
      }
    }
  }

  async function sendQuestion(event) {
    event.preventDefault();

    const currentQuestion = question.trim();

    if (!currentQuestion || asking) return;

    setError("");
    setQuestion("");

    setMessages((previous) => [
      ...previous,
      { role: "user", content: currentQuestion, sources: [] },
    ]);

    setAsking(true);

    try {
      const response = await fetch(`${API_URL}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: currentQuestion }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Question answering failed.");
      }

      setMessages((previous) => [
        ...previous,
        {
          role: "assistant",
          content: data.answer || "No answer was returned.",
          sources: data.sources || [],
        },
      ]);
    } catch (err) {
      setError(
        `${err.message}. Check that your FastAPI backend is running.`
      );
    } finally {
      setAsking(false);
    }
  }

  function startNewChat() {
    setMessages([
      {
        role: "assistant",
        content:
          "New chat started. Ask a question about your indexed documents.",
        sources: [],
      },
    ]);
    setError("");
  }

  return (
    <div className="app-shell">
      {sidebarOpen && (
        <aside className="sidebar">
          <div className="brand">
            <div className="brand-icon">
              <Sparkles size={21} />
            </div>
            <div>
              <h1>Knowledge AI</h1>
              <span>Multi-PDF Assistant</span>
            </div>
            <button
              className="icon-button sidebar-close"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close sidebar"
            >
              <PanelLeftClose size={19} />
            </button>
          </div>

          <button className="new-chat-button" onClick={startNewChat}>
            <Plus size={18} />
            New conversation
          </button>

          <div className="sidebar-section">
            <div className="section-heading">
              <span>YOUR DOCUMENTS</span>
              <span className="count">{documents.length}</span>
            </div>

            <button
              className="upload-button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? (
                <LoaderCircle className="spin" size={19} />
              ) : (
                <Upload size={19} />
              )}
              <span>{uploading ? "Indexing PDF..." : "Upload PDF files"}</span>
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              multiple
              hidden
              onChange={uploadFiles}
            />

            <div className="document-list">
              {documents.map((document) => (
                <div className="document-item" key={document.name}>
                  <div className="pdf-icon">
                    <FileText size={18} />
                  </div>
                  <div className="document-details">
                    <span className="document-name" title={document.name}>
                      {document.name}
                    </span>
                    <span>
                      {document.pages} pages · {document.chunks} chunks
                    </span>
                  </div>
                </div>
              ))}

              {documents.length === 0 && (
                <p className="empty-documents">
                  Your uploaded documents will appear here.
                </p>
              )}
            </div>
          </div>

          <div className="sidebar-footer">
            <div className={`status-dot ${apiOnline ? "online" : ""}`} />
            <span>{apiOnline ? "API connected" : "API disconnected"}</span>
          </div>
        </aside>
      )}

      <main className="main-panel">
        <header className="topbar">
          <div className="topbar-title">
            {!sidebarOpen && (
              <button
                className="icon-button"
                onClick={() => setSidebarOpen(true)}
                aria-label="Open sidebar"
              >
                <PanelLeftOpen size={20} />
              </button>
            )}
            <div>
              <h2>Document Assistant</h2>
              <p>Ask questions across your knowledge base</p>
            </div>
          </div>

          <div className={`connection-badge ${apiOnline ? "connected" : ""}`}>
            <span className="status-dot" />
            {apiOnline ? "Connected" : "Offline"}
          </div>
        </header>

        <section className="chat-area">
          <div className="messages">
            {messages.map((message, index) => (
              <article
                className={`message-row ${message.role}`}
                key={`${index}-${message.role}`}
              >
                <div className={`avatar ${message.role}`}>
                  {message.role === "assistant" ? (
                    <Bot size={20} />
                  ) : (
                    <span>Y</span>
                  )}
                </div>

                <div className="message-content">
                  <div className="message-author">
                    {message.role === "assistant" ? "Knowledge AI" : "You"}
                  </div>
                  <div className="message-text">{message.content}</div>

                  {message.sources?.length > 0 && (
                    <div className="sources-panel">
                      <div className="sources-heading">
                        <FileText size={15} />
                        Sources used
                      </div>
                      {message.sources.map((source, sourceIndex) => (
                        <div
                          className="source-item"
                          key={`${source.source}-${source.page}-${sourceIndex}`}
                        >
                          <FileText size={15} />
                          <span>{source.source}</span>
                          <span className="page-tag">
                            Page {source.page}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </article>
            ))}

            {asking && (
              <article className="message-row assistant">
                <div className="avatar assistant">
                  <Bot size={20} />
                </div>
                <div className="message-content">
                  <div className="message-author">Knowledge AI</div>
                  <div className="thinking-indicator">
                    <LoaderCircle className="spin" size={17} />
                    Searching documents and generating an answer...
                  </div>
                </div>
              </article>
            )}

            <div ref={messagesEndRef} />
          </div>
        </section>

        <footer className="composer-area">
          {error && (
            <div className="error-banner">
              <AlertCircle size={17} />
              <span>{error}</span>
              <button
                className="icon-button"
                onClick={() => setError("")}
                aria-label="Dismiss error"
              >
                <Trash2 size={15} />
              </button>
            </div>
          )}

          <form className="composer" onSubmit={sendQuestion}>
            <textarea
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="Ask anything about your documents..."
              rows={2}
              disabled={asking}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  event.currentTarget.form?.requestSubmit();
                }
              }}
            />
            <div className="composer-bottom">
              <span>
                Answers are generated from your indexed document collection.
              </span>
              <button
                type="submit"
                className="send-button"
                disabled={asking || !question.trim()}
                aria-label="Send question"
              >
                {asking ? (
                  <LoaderCircle className="spin" size={18} />
                ) : (
                  <Send size={18} />
                )}
                Ask AI
              </button>
            </div>
          </form>
          <p className="disclaimer">
            AI-generated answers can be inaccurate. Verify important details
            against the original documents.
          </p>
        </footer>
      </main>
    </div>
  );
}
