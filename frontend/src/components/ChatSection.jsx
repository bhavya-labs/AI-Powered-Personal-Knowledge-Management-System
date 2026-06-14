import { useState, useRef, useEffect } from "react";
import { MessageSquare, Send, Sparkles, AlertCircle, FileText, ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import axios from "axios";
import { getApiBaseUrl } from "../config";

function ChatSection({ documents = [] }) {
  const [question, setQuestion] = useState("");
  const [selectedDocId, setSelectedDocId] = useState("");
  const [sessions, setSessions] = useState([]);
  const [activeChatId, setActiveChatId] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedSources, setExpandedSources] = useState({});
  const messagesEndRef = useRef(null);

  const starterPrompts = [
    "What are the key conclusions in these documents?",
    "Can you provide a high-level summary of the main points?",
    "Identify any action items or next steps mentioned.",
  ];

  // Fetch all chat sessions on mount
  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async (autoSelectId = null) => {
    try {
      const response = await axios.get(`${getApiBaseUrl()}/chats`);
      const fetchedSessions = response.data;
      setSessions(fetchedSessions);

      if (autoSelectId) {
        handleSelectSession(autoSelectId);
      } else if (fetchedSessions.length > 0 && !activeChatId) {
        // Automatically load the latest session
        handleSelectSession(fetchedSessions[0].chat_id);
      } else if (fetchedSessions.length === 0) {
        // No sessions, start fresh
        setActiveChatId("");
        setMessages([
          {
            sender: "ai",
            text: "Hello! I am your MindMesh AI document assistant. Ask me questions about your uploaded documents, and I'll extract answers along with page citations.",
            sources: [],
            timestamp: new Date().toISOString()
          }
        ]);
      }
    } catch (error) {
      console.error("Error fetching chat sessions:", error);
    }
  };

  const handleSelectSession = async (chatId) => {
    try {
      setActiveChatId(chatId);
      const response = await axios.get(`${getApiBaseUrl()}/chats/${chatId}`);
      setMessages(response.data.messages || []);
    } catch (error) {
      console.error("Error loading chat session messages:", error);
      setMessages([]);
    }
  };

  const handleCreateNewChat = () => {
    setActiveChatId("");
    setMessages([
      {
        sender: "ai",
        text: "Started a new conversation thread. Ask me anything about your uploaded documents!",
        sources: [],
        timestamp: new Date().toISOString()
      }
    ]);
  };

  const handleDeleteSession = async (chatId, e) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this chat history?")) {
      return;
    }
    try {
      await axios.delete(`${getApiBaseUrl()}/chats/${chatId}`);
      if (activeChatId === chatId) {
        setActiveChatId("");
        // Reload list, it will automatically select the next latest
        fetchSessions();
      } else {
        setSessions((prev) => prev.filter((s) => s.chat_id !== chatId));
      }
    } catch (error) {
      console.error("Failed to delete chat session:", error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const askQuestion = async (textToSend) => {
    const queryText = textToSend || question;
    if (!queryText.trim()) return;

    setLoading(true);
    setQuestion("");

    let currentChatId = activeChatId;
    const timestampStr = new Date().toISOString();

    // If new conversation, create thread first
    if (!currentChatId) {
      try {
        const titleText = queryText.length > 30 ? queryText.slice(0, 30) + "..." : queryText;
        const createResponse = await axios.post(`${getApiBaseUrl()}/chats`, {
          title: titleText
        });
        currentChatId = createResponse.data.chat_id;
        setActiveChatId(currentChatId);
        
        // Append user greeting placeholder to have a clean feed
        setMessages([]);
      } catch (error) {
        console.error("Failed to create chat thread in backend:", error);
        setLoading(false);
        return;
      }
    }

    const userMsg = {
      sender: "user",
      text: queryText,
      sources: [],
      timestamp: timestampStr
    };

    // Save User message to backend
    try {
      await axios.post(`${getApiBaseUrl()}/chats/${currentChatId}/messages`, userMsg);
    } catch (error) {
      console.error("Failed to save user message in backend:", error);
    }

    // Append locally
    setMessages((prev) => [...prev, userMsg]);

    const savedEngine = localStorage.getItem("mindmesh_engine") || "local";
    const savedKey = localStorage.getItem("mindmesh_gemini_key") || "";
    
    const headers = {};
    if (savedEngine === "gemini" && savedKey) {
      headers["X-Gemini-API-Key"] = savedKey;
    }

    try {
      const response = await axios.post(
        `${getApiBaseUrl()}/chat`,
        {
          question: queryText,
          doc_id: selectedDocId || null
        },
        { headers }
      );

      const aiMsg = {
        sender: "ai",
        text: response.data.answer,
        sources: response.data.sources || [],
        timestamp: new Date().toISOString()
      };

      // Save AI message to backend
      await axios.post(`${getApiBaseUrl()}/chats/${currentChatId}/messages`, aiMsg);

      // Append locally
      setMessages((prev) => [...prev, aiMsg]);
      
      // Update session list to get correct titles & order
      fetchSessions(currentChatId);

    } catch (error) {
      console.error(error);
      const errorText = error.response?.data?.detail || "I encountered an error connecting to the AI model. Please verify that your backend server is running, or double-check your Gemini API key in Settings.";
      const errorMsg = {
        sender: "ai",
        text: `Error: ${errorText}`,
        sources: [],
        timestamp: new Date().toISOString()
      };
      
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      askQuestion();
    }
  };

  const toggleSources = (msgIndex) => {
    setExpandedSources((prev) => ({
      ...prev,
      [msgIndex]: !prev[msgIndex]
    }));
  };

  return (
    <div className="bg-zinc-900/50 backdrop-blur-md border border-zinc-800/80 rounded-2xl flex h-[650px] overflow-hidden animate-fade-in">
      
      {/* Left Chat Sidebar (Sessions Selector) */}
      <div className="w-64 border-r border-zinc-850 bg-zinc-950/30 flex flex-col shrink-0">
        <div className="p-4 border-b border-zinc-850 shrink-0">
          <button
            onClick={handleCreateNewChat}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition duration-300 shadow-md shadow-blue-500/10 active:scale-95"
          >
            <Plus size={14} />
            <span>New Conversation</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
          <span className="text-[10px] font-bold text-zinc-550 tracking-wider uppercase pl-2 block mb-2">
            History Threads ({sessions.length})
          </span>

          {sessions.length === 0 ? (
            <div className="text-center py-8 text-zinc-500 text-xs">
              No recent chats.
            </div>
          ) : (
            sessions.map((s) => (
              <div
                key={s.chat_id}
                onClick={() => handleSelectSession(s.chat_id)}
                className={`flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition group text-xs ${
                  activeChatId === s.chat_id
                    ? "bg-zinc-800 text-white font-medium"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40"
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <MessageSquare size={13} className="shrink-0 text-zinc-550" />
                  <span className="truncate">{s.title}</span>
                </div>
                <button
                  onClick={(e) => handleDeleteSession(s.chat_id, e)}
                  className="text-zinc-550 hover:text-red-400 opacity-0 group-hover:opacity-100 transition p-0.5"
                  title="Delete Conversation"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right Chat Room */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Chat Room Header */}
        <div className="p-4 border-b border-zinc-850 bg-zinc-950/20 flex items-center justify-between gap-3 shrink-0">
          <div>
            <h3 className="text-base font-bold text-white font-display">
              {activeChatId 
                ? sessions.find((s) => s.chat_id === activeChatId)?.title || "Active Chat" 
                : "New Conversation"}
            </h3>
            <p className="text-[11px] text-zinc-500">Ask questions with auto-citations</p>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedDocId}
              onChange={(e) => setSelectedDocId(e.target.value)}
              className="bg-zinc-950/80 text-zinc-300 border border-zinc-800 hover:border-zinc-700 focus:border-blue-500 rounded-xl px-3 py-1.5 outline-none text-xs"
            >
              <option value="">All Documents</option>
              {documents.map((doc) => (
                <option key={doc.doc_id} value={doc.doc_id}>
                  {doc.filename}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Messages Stream */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-6 whitespace-pre-wrap ${
                  msg.sender === "user"
                    ? "bg-blue-600 text-white rounded-tr-none shadow-lg shadow-blue-600/10"
                    : "bg-zinc-800/80 text-zinc-100 border border-zinc-750 rounded-tl-none"
                }`}
              >
                {msg.text}
              </div>

              {/* Citations Panel */}
              {msg.sender === "ai" && msg.sources && msg.sources.length > 0 && (
                <div className="mt-2 ml-1">
                  <button
                    onClick={() => toggleSources(index)}
                    className="flex items-center gap-1 text-[11px] font-semibold text-zinc-400 hover:text-blue-400 transition"
                  >
                    <FileText size={11} />
                    <span>{msg.sources.length} sources cited</span>
                    {expandedSources[index] ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </button>

                  {expandedSources[index] && (
                    <div className="mt-2 space-y-1.5 transition-all duration-300 animate-slide-down">
                      {msg.sources.map((src, sIdx) => (
                        <div
                          key={sIdx}
                          className="bg-zinc-950/60 border border-zinc-850 rounded-lg p-2 text-[11px] text-zinc-400 flex items-center gap-2 max-w-md"
                        >
                          <FileText size={12} className="text-zinc-650 shrink-0" />
                          <span className="font-semibold text-zinc-300 truncate max-w-[200px]" title={src.filename}>
                            {src.filename}
                          </span>
                          <span className="text-zinc-600 shrink-0">|</span>
                          <span className="text-zinc-500 shrink-0">Page {src.page}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex items-start">
              <div className="bg-zinc-800/80 border border-zinc-750 text-zinc-400 rounded-2xl rounded-tl-none px-4 py-3 text-xs flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce"></span>
                <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                <span>Thinking...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Starter Prompts */}
        {messages.length <= 1 && !loading && (
          <div className="px-4 py-3 bg-zinc-950/10 border-t border-zinc-850 shrink-0">
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Sparkles size={10} className="text-blue-500" />
              Suggested Questions
            </p>
            <div className="flex flex-wrap gap-2">
              {starterPrompts.map((prompt, pIdx) => (
                <button
                  key={pIdx}
                  onClick={() => askQuestion(prompt)}
                  className="bg-zinc-950/40 hover:bg-zinc-800/60 border border-zinc-800 text-zinc-300 hover:text-white rounded-lg px-3 py-1.5 text-xs text-left transition"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input Form */}
        <div className="p-4 border-t border-zinc-850 bg-zinc-950/20 shrink-0">
          <div className="flex gap-2">
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder={documents.length === 0 ? "Upload documents first to start chatting..." : "Type your question about documents here... (Enter to send)"}
              disabled={documents.length === 0 || loading}
              rows={1}
              className="flex-1 bg-zinc-950 text-white placeholder:text-zinc-600 border border-zinc-800 hover:border-zinc-750 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all rounded-xl py-3 px-4 outline-none text-sm resize-none disabled:opacity-50"
            />

            <button
              onClick={() => askQuestion()}
              disabled={documents.length === 0 || loading || !question.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white p-3.5 rounded-xl transition-all active:scale-95 disabled:opacity-55 disabled:pointer-events-none self-end shadow-lg shadow-blue-500/10"
            >
              <Send size={16} />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

export default ChatSection;