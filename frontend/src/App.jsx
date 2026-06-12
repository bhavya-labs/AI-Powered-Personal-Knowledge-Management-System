import { useState, useEffect } from "react";
import axios from "axios";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import DashboardCards from "./components/DashboardCards";
import UploadSection from "./components/UploadSection";
import ChatSection from "./components/ChatSection";
import SearchSection from "./components/SearchSection";
import SettingsSection from "./components/SettingsSection";
import { MessageSquare, Search, FileUp, Sparkles, FileText, ArrowRight } from "lucide-react";
import { getApiBaseUrl } from "./config";

function App() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [documents, setDocuments] = useState([]);
  const [stats, setStats] = useState({ documents: 0, pages: 0, chunks: 0 });
  const [isServerOnline, setIsServerOnline] = useState(false);

  const fetchRegistryData = async () => {
    try {
      const apiUrl = getApiBaseUrl();
      // Test server connection
      const homeResponse = await axios.get(`${apiUrl}/`);
      if (homeResponse.data.status === "online" || homeResponse.data.message) {
        setIsServerOnline(true);
      }

      // Fetch documents list
      const docsResponse = await axios.get(`${apiUrl}/documents`);
      setDocuments(docsResponse.data);

      // Fetch stats
      const statsResponse = await axios.get(`${apiUrl}/stats`);
      setStats(statsResponse.data);
    } catch (error) {
      console.error("Backend offline or request failed:", error);
      setIsServerOnline(false);
    }
  };

  useEffect(() => {
    fetchRegistryData();
    // Poll stats and server online state every 5 seconds
    const interval = setInterval(fetchRegistryData, 5000);
    return () => clearInterval(interval);
  }, []);

  const renderContent = () => {
    if (!isServerOnline) {
      return (
        <div className="bg-zinc-900/35 border border-zinc-800 rounded-2xl p-12 text-center flex flex-col items-center justify-center min-h-[400px] animate-fade-in">
          <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/25 flex items-center justify-center text-red-500 mb-4 animate-pulse">
            <AlertCircleIcon size={24} />
          </div>
          <h3 className="text-lg font-bold text-white font-display mb-1">Backend Server Offline</h3>
          <p className="text-zinc-400 text-xs max-w-sm leading-relaxed mb-6">
            We cannot establish a connection to your FastAPI backend at <code className="text-red-400">{getApiBaseUrl()}</code>. Please start the python server to access the platform.
          </p>
          <div className="bg-zinc-950/60 border border-zinc-850 rounded-xl p-4 text-left font-mono text-[11px] text-zinc-500 max-w-md w-full">
            <p className="font-bold text-zinc-400 mb-1">To start the backend:</p>
            <p className="text-zinc-550">cd backend</p>
            <p className="text-zinc-550">.\venv\Scripts\python.exe -m uvicorn main:app --reload</p>
          </div>
        </div>
      );
    }

    switch (activeTab) {
      case "dashboard":
        return (
          <div className="space-y-8 animate-fade-in">
            {/* System Counters */}
            <DashboardCards stats={stats} />

            {/* Split Screen Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Recent Files Panel */}
              <div className="lg:col-span-2 bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-5">
                  <h4 className="text-sm font-bold font-display text-white uppercase tracking-wider">
                    Recent Indexed Files
                  </h4>
                  <button
                    onClick={() => setActiveTab("upload")}
                    className="text-xs text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1 transition"
                  >
                    View Registry
                    <ArrowRight size={12} />
                  </button>
                </div>

                {documents.length === 0 ? (
                  <div className="text-center py-10 border border-zinc-800/40 rounded-xl bg-zinc-950/20">
                    <FileText className="mx-auto text-zinc-700 mb-2" size={24} />
                    <p className="text-xs text-zinc-500">No index vectors. Upload files to get started.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {documents.slice(0, 3).map((doc) => (
                      <div
                        key={doc.doc_id}
                        onClick={() => setActiveTab("upload")}
                        className="p-4 bg-zinc-950/40 border border-zinc-850 hover:border-zinc-800 hover:bg-zinc-900/20 rounded-xl flex items-center justify-between gap-4 cursor-pointer transition-all duration-300"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="p-2 rounded bg-zinc-900 text-zinc-400 shrink-0">
                            <FileText size={16} />
                          </div>
                          <div className="min-w-0">
                            <h5 className="text-xs font-semibold text-white truncate max-w-[200px] md:max-w-md">
                              {doc.filename}
                            </h5>
                            <span className="text-[10px] text-zinc-500 block mt-0.5">
                              {doc.pages} pages • {Math.round(doc.size / 1024)} KB
                            </span>
                          </div>
                        </div>
                        <span className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 font-bold px-2 py-0.5 rounded-full shrink-0">
                          Indexed
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Quick Actions Panel */}
              <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6 flex flex-col justify-between">
                <div>
                  <h4 className="text-sm font-bold font-display text-white uppercase tracking-wider mb-4">
                    Quick Navigation
                  </h4>
                  <p className="text-xs text-zinc-400 leading-relaxed mb-6">
                    Jump straight to core workspaces to analyze documents and extract insights.
                  </p>
                </div>

                <div className="space-y-3">
                  <button
                    onClick={() => setActiveTab("upload")}
                    className="w-full bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-350 hover:text-white text-xs font-medium py-3 px-4 rounded-xl flex items-center justify-between transition-all group"
                  >
                    <div className="flex items-center gap-2">
                      <FileUp size={14} className="text-blue-400" />
                      <span>Upload Notes</span>
                    </div>
                    <ArrowRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>

                  <button
                    onClick={() => setActiveTab("chat")}
                    className="w-full bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-350 hover:text-white text-xs font-medium py-3 px-4 rounded-xl flex items-center justify-between transition-all group"
                  >
                    <div className="flex items-center gap-2">
                      <MessageSquare size={14} className="text-violet-400" />
                      <span>Ask AI Chat</span>
                    </div>
                    <ArrowRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>

                  <button
                    onClick={() => setActiveTab("search")}
                    className="w-full bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-350 hover:text-white text-xs font-medium py-3 px-4 rounded-xl flex items-center justify-between transition-all group"
                  >
                    <div className="flex items-center gap-2">
                      <Search size={14} className="text-emerald-400" />
                      <span>Semantic Search</span>
                    </div>
                    <ArrowRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                </div>
              </div>

            </div>
          </div>
        );
      case "upload":
        return (
          <UploadSection
            documents={documents}
            onRegistryUpdate={fetchRegistryData}
          />
        );
      case "chat":
        return <ChatSection documents={documents} />;
      case "search":
        return <SearchSection documents={documents} />;
      case "settings":
        return <SettingsSection onRegistryUpdate={fetchRegistryData} />;
      default:
        return null;
    }
  };

  return (
    <div className="flex bg-[#09090b] min-h-screen text-zinc-100 font-sans">
      {/* Navigation Sidebar */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Panel */}
      <div className="flex-1 p-6 md:p-8 flex flex-col min-w-0 max-h-screen overflow-y-auto">
        {/* Dynamic Header */}
        <Header activeTab={activeTab} isServerOnline={isServerOnline} />

        {/* View Component Content */}
        <div className="flex-1 min-h-0">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}

// Inline helper icon for server offline state
function AlertCircleIcon({ size = 18 }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

export default App;