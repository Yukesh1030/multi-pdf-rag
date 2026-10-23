import { useCallback, useEffect, useRef, useState } from "react";
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
  MessageSquare,
  Check,
  Menu,
} from "lucide-react";
import "./App.css";

const API_URL = "https://multi-pdf-rag-api-2h8k.onrender.com";

const WELCOME_MESSAGE = {
  role: "assistant",
  content:
    "Hello! I'm your document assistant. Upload your PDFs and ask questions about their content. I'll search your knowledge base and help you find the information you need.",
  sources: [],
};

async function readResponse(response) {
  const text = await response.text();

  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error("The server returned an invalid response.");
  }

  if (!response.ok) {
    throw new Error(data.detail || `Request failed (${response.status}).`);
  }

  return data;
}

export default function App() {
  const [documents, setDocuments] = useState([]);
  const [messages, setMessages] = useState([WELCOME_MESSAGE]);
  const [question, setQuestion] = useState("");
  const [uploading, setUploading] = useState(false);
  const [asking, setAsking] = useState(false);
  const [deleting, setDeleting] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [apiOnline, setApiOnline] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  const loadDocuments = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/documents`);
      const data = await readResponse(response);

      setDocuments(
        (data.documents || []).map((document) => ({
          ...document,
          pages: document.pages ?? null,
          chunks: document.chunks ?? null,
        }))
      );
      setApiOnline(true);
    } catch {
      setApiOnline(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    async function checkApi() {
      try {
        const response = await fetch(`${API_URL}/`);
        if (active) setApiOnline(response.ok);
      } catch {
        if (active) setApiOnline(false);
      }
    }

    checkApi();
    loadDocuments();

    return () => {
      active = false;
    };
  }, [loadDocuments]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, asking]);

  async function uploadFiles(event) {
    const files = Array.from(event.target.files || []);
    event.target.value = "";

    if (!files.length) return;

    setError("");
    setNotice("");

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

        const data = await readResponse(response);

        setMessages((previous) => [
          ...previous,
          {
            role: "assistant",
            content: `Successfully processed ${data.filename}: ${data.pages_extracted} pages and ${data.chunks_indexed} chunks indexed. You can now ask questions about this document.`,
            sources: [],
          },
        ]);

        setNotice(`${data.filename} uploaded successfully.`);
        await loadDocuments();
      } catch (err) {
        setError(
          `${file.name}: ${err.message || "Unable to upload the PDF."}`
        );
      } finally {
        setUploading(false);
      }
    }
  }

  async function deleteDocument(document) {
    const confirmed = window.confirm(
      `Delete "${document.name}"?\n\nThis will remove the uploaded PDF and its indexed chunks.`
    );

    if (!confirmed) return;

    setDeleting(document.name);
    setError("");
    setNotice("");

    try {
      const response = await fetch(
        `${API_URL}/documents/${encodeURIComponent(document.name)}`,
        { method: "DELETE" }
      );

      const data = await readResponse(response);

      setDocuments((previous) =>
        previous.filter((item) => item.name !== document.name)
      );

      setNotice(
        `${document.name} deleted. ${data.chunks_deleted ?? 0} indexed chunks removed.`
      );
    } catch (err) {
      setError(
        `Could not delete ${document.name}: ${err.message || "Request failed."}`
      );
      await loadDocuments();
    } finally {
      setDeleting("");
    }
  }

  async function sendQuestion(event) {
    event.preventDefault();

    const currentQuestion = question.trim();
    if (!currentQuestion || asking) return;

    setError("");
    setNotice("");
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

      const data = await readResponse(response);

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
        `${err.message || "Question answering failed."} Check the deployed API.`
      );
    } finally {
      setAsking(false);
      textareaRef.current?.focus();
    }
  }

  function startNewChat() {
    setMessages([WELCOME_MESSAGE]);
    setQuestion("");
    setError("");
    setNotice("");
    textareaRef.current?.focus();
  }

  return (
    <div className="app-shell">
      {sidebarOpen && (
        <>
          <button
            className="mobile-backdrop"
            aria-label="Close sidebar"
            onClick={() => setSidebarOpen(false)}
          />

          <aside className="sidebar">
            <div className="brand">
              <div className="brand-icon">
                <Sparkles size={23} />
              </div>
              <div className="brand-copy">
                <h1>Knowledge AI</h1>
                <span>YOUR DOCUMENT ASSISTANT</span>
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
              <Plus size={19} />
              <span>New chat</span>
            </button>

            <div className="sidebar-section">
              <div className="section-heading">
                <span>YOUR KNOWLEDGE</span>
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
                <span>{uploading ? "Processing PDFs..." : "Upload documents"}</span>
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
                      <span className="document-meta">
                        {document.pages != null
                          ? `${document.pages} pages`
                          : document.size_bytes != null
                            ? `${(document.size_bytes / 1024).toFixed(0)} KB`
                            : "PDF document"}
                        {document.chunks != null
                          ? ` · ${document.chunks} chunks`
                          : ""}
                      </span>
                    </div>

                    <button
                      className="delete-document-button"
                      onClick={() => deleteDocument(document)}
                      disabled={Boolean(deleting)}
                      aria-label={`Delete ${document.name}`}
                      title="Delete document"
                    >
                      {deleting === document.name ? (
                        <LoaderCircle className="spin" size={17} />
                      ) : (
                        <Trash2 size={17} />
                      )}
                    </button>
                  </div>
                ))}

                {documents.length === 0 && (
                  <div className="empty-documents">
                    <FileText size={25} />
                    <p>No documents yet</p>
                    <span>Upload a PDF to get started.</span>
                  </div>
                )}
              </div>
            </div>

            <div className="sidebar-footer">
              <span className={`status-dot ${apiOnline ? "online" : ""}`} />
              <div>
                <strong>{apiOnline ? "Connected" : "Disconnected"}</strong>
                <span>Knowledge API</span>
              </div>
              <button
                className="icon-button refresh-button"
                onClick={loadDocuments}
                title="Refresh document list"
                aria-label="Refresh documents"
              >
                <LoaderCircle size={17} />
              </button>
            </div>
          </aside>
        </>
      )}

      <main className="main-panel">
        <header className="topbar">
          <div className="topbar-title">
            {!sidebarOpen && (
              <button
                className="icon-button menu-button"
                onClick={() => setSidebarOpen(true)}
                aria-label="Open sidebar"
              >
                <PanelLeftOpen size={20} />
              </button>
            )}
            <div className="topbar-mark">
              <Sparkles size={19} />
            </div>
            <div>
              <h2>Document Assistant</h2>
              <p>Explore your knowledge, naturally.</p>
            </div>
          </div>

          <div className={`connection-badge ${apiOnline ? "connected" : ""}`}>
            <span className="status-dot" />
            {apiOnline ? "Online" : "Offline"}
          </div>
        </header>

        <section className="chat-area">
          <div className="messages">
            {messages.length === 1 && messages[0].role === "assistant" && (
              <div className="welcome-hero">
                <div className="welcome-glow">
                  <Sparkles size={30} />
                </div>
                <p className="eyebrow">YOUR PERSONAL KNOWLEDGE SPACE</p>
                <h1>
                  Hello, <span>curious mind.</span>
                </h1>
                <p className="welcome-description">
                  Your documents hold the answers. Let's find them together.
                  Upload your PDFs and start exploring.
                </p>

                <div className="suggestion-grid">
                  {[
                    {
                      icon: <FileText size={18} />,
                      title: "Summarize a document",
                      prompt: "Summarize the key points in my uploaded documents.",
                    },
                    {
                      icon: <MessageSquare size={18} />,
                      title: "Find key information",
                      prompt: "What are the most important facts in my documents?",
                    },
                    {
                      icon: <Sparkles size={18} />,
                      title: "Explore the details",
                      prompt: "What topics are covered in my uploaded documents?",
                    },
                  ].map((item) => (
                    <button
                      className="suggestion-card"
                      key={item.title}
                      onClick={() => {
                        setQuestion(item.prompt);
                        textareaRef.current?.focus();
                      }}
                    >
                      <span className="suggestion-icon">{item.icon}</span>
                      <span>{item.title}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((message, index) => {
              if (
                index === 0 &&
                message.role === "assistant" &&
                messages.length === 1
              ) {
                return null;
              }

              return (
                <article
                  className={`message-row ${message.role}`}
                  key={`${index}-${message.role}`}
                >
                  <div className={`avatar ${message.role}`}>
                    {message.role === "assistant" ? (
                      <Sparkles size={19} />
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
                          Sources
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
              );
            })}

            {asking && (
              <article className="message-row assistant">
                <div className="avatar assistant">
                  <Sparkles size={19} />
                </div>
                <div className="message-content">
                  <div className="message-author">Knowledge AI</div>
                  <div className="thinking-indicator">
                    <LoaderCircle className="spin" size={17} />
                    Searching your documents...
                  </div>
                </div>
              </article>
            )}

            <div ref={messagesEndRef} />
          </div>
        </section>

        <footer className="composer-area">
          {(error || notice) && (
            <div className={`feedback-banner ${error ? "has-error" : ""}`}>
              {error ? (
                <AlertCircle size={17} />
              ) : (
                <Check size={17} />
              )}
              <span>{error || notice}</span>
              <button
                className="icon-button"
                onClick={() => {
                  setError("");
                  setNotice("");
                }}
                aria-label="Dismiss message"
              >
                <Plus size={16} />
              </button>
            </div>
          )}

          <form className="composer" onSubmit={sendQuestion}>
            <textarea
              ref={textareaRef}
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="Ask Knowledge AI anything..."
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
              <span className="composer-hint">
                <Sparkles size={14} />
                Answers grounded in your documents
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
                  <Send size={17} />
                )}
                <span>Send</span>
              </button>
            </div>
          </form>
          <p className="disclaimer">
            AI can make mistakes. Verify important information in your original PDFs.
          </p>
        </footer>
      </main>
    </div>
  );
}
