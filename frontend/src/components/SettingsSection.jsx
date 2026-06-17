import { useState, useEffect } from "react";
import { Cpu, CloudLightning, Key, Trash2, CheckCircle2, ShieldAlert, Globe } from "lucide-react";
import axios from "axios";
import { getApiBaseUrl } from "../config";

function SettingsSection({ onRegistryUpdate }) {
  const [engine, setEngine] = useState("local");
  const [apiKey, setApiKey] = useState("");
  const [apiUrl, setApiUrl] = useState("");
  const [saveStatus, setSaveStatus] = useState("");
  const [isWiping, setIsWiping] = useState(false);

  useEffect(() => {
    const savedEngine = localStorage.getItem("mindmesh_engine") || "local";
    const savedKey = localStorage.getItem("mindmesh_gemini_key") || "";
    const savedApiUrl = getApiBaseUrl();
    setEngine(savedEngine);
    setApiKey(savedKey);
    setApiUrl(savedApiUrl);
  }, []);

  const handleSaveSettings = () => {
    // Validate Backend API URL
    if (apiUrl && !apiUrl.startsWith("http://") && !apiUrl.startsWith("https://")) {
      alert("Validation Error: Please enter a valid Backend API URL starting with http:// or https://");
      return;
    }
    
    localStorage.setItem("mindmesh_engine", engine);
    localStorage.setItem("mindmesh_gemini_key", apiKey);
    localStorage.setItem("mindmesh_api_url", apiUrl);
    setSaveStatus("Settings saved successfully!");
    
    setTimeout(() => {
      setSaveStatus("");
    }, 3000);
  };

  const handleWipeDatabase = async () => {
    if (!window.confirm("Are you absolutely sure you want to delete all uploaded documents and reset the database? This cannot be undone.")) {
      return;
    }

    try {
      setIsWiping(true);
      // Fetch all documents and delete them one by one
      const docsResponse = await axios.get(`${getApiBaseUrl()}/documents`);
      const docs = docsResponse.data;
      
      for (const doc of docs) {
        await axios.delete(`${getApiBaseUrl()}/documents/${doc.doc_id}`);
      }

      alert("Database wiped successfully!");
      if (onRegistryUpdate) onRegistryUpdate();
    } catch (error) {
      console.error("Error wiping database:", error);
      alert("Failed to fully wipe database. Some files may still remain.");
    } finally {
      setIsWiping(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl animate-fade-in">
      <div className="bg-zinc-900/50 backdrop-blur-md border border-zinc-800/80 rounded-2xl p-6 md:p-8">
        <h3 className="text-2xl font-bold font-display text-white mb-6 flex items-center gap-2">
          System Settings
        </h3>

        <div className="space-y-8">
          {/* LLM Engine Picker */}
          <div>
            <label className="text-sm font-semibold text-zinc-300 block mb-3">
              LLM Generation Engine
            </label>
            <p className="text-xs text-zinc-400 mb-4 leading-relaxed">
              Choose whether to run AI text generation locally on your CPU or connect to Google's high-speed Gemini Cloud.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Local Engine */}
              <div
                onClick={() => setEngine("local")}
                className={`p-5 rounded-xl border cursor-pointer transition-all duration-300 flex items-start gap-4 ${
                  engine === "local"
                    ? "bg-blue-500/10 border-blue-500/80 text-white shadow-[0_0_15px_rgba(59,130,246,0.1)]"
                    : "bg-zinc-950/40 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                }`}
              >
                <div className={`p-2 rounded-lg ${engine === "local" ? "bg-blue-500/20 text-blue-400" : "bg-zinc-800 text-zinc-500"}`}>
                  <Cpu size={24} />
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-white mb-1">Local CPU Models</h4>
                  <p className="text-xs leading-relaxed text-zinc-400">
                    Runs offline using local models (BART & Flan-T5). Requires CPU memory and can be slow depending on computer specs.
                  </p>
                </div>
              </div>

              {/* Gemini Cloud Engine */}
              <div
                onClick={() => setEngine("gemini")}
                className={`p-5 rounded-xl border cursor-pointer transition-all duration-300 flex items-start gap-4 ${
                  engine === "gemini"
                    ? "bg-indigo-500/10 border-indigo-500/80 text-white shadow-[0_0_15px_rgba(99,102,241,0.1)]"
                    : "bg-zinc-950/40 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                }`}
              >
                <div className={`p-2 rounded-lg ${engine === "gemini" ? "bg-indigo-500/20 text-indigo-400" : "bg-zinc-800 text-zinc-500"}`}>
                  <CloudLightning size={24} />
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-white mb-1">Google Gemini Cloud (Recommended)</h4>
                  <p className="text-xs leading-relaxed text-zinc-400">
                    Connects directly to Google's API. Responses are blazingly fast, highly accurate, and offload all CPU memory overhead.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Backend API Configuration */}
          <div className="space-y-3 pt-4 border-t border-zinc-800/85">
            <label className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
              <Globe size={16} className="text-blue-400" />
              Backend API Endpoint URL
            </label>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Define the API base URL for your FastAPI backend. Use <code>http://127.0.0.1:8000</code> for local runs or paste your cloud URL (e.g. Render or Hugging Face Space URL).
            </p>
            <input
              type="text"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              placeholder="http://127.0.0.1:8000"
              className="w-full bg-zinc-950/80 text-white border border-zinc-800 hover:border-zinc-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all rounded-xl py-3 px-4 outline-none text-sm placeholder:text-zinc-650"
            />
          </div>

          {/* Gemini API Key */}
          {engine === "gemini" && (
            <div className="space-y-3 pt-4 border-t border-zinc-800/85 transition-all duration-300 animate-slide-down">
              <label className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
                <Key size={16} className="text-indigo-400" />
                Gemini API Key
              </label>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Provide your Gemini API Key. Your key is stored locally in your browser's localStorage and is transmitted directly to Google's servers.
              </p>
              
              <div className="relative">
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full bg-zinc-950/80 text-white border border-zinc-800 hover:border-zinc-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all rounded-xl py-3 px-4 outline-none text-sm font-mono placeholder:text-zinc-600"
                />
              </div>
              <p className="text-xs text-zinc-500">
                Don't have a key? You can get a free developer key at{" "}
                <a
                  href="https://aistudio.google.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-400 hover:underline"
                >
                  Google AI Studio
                </a>.
              </p>
            </div>
          )}

          {/* Save Action */}
          <div className="flex items-center gap-4 pt-4 border-t border-zinc-800/85">
            <button
              onClick={handleSaveSettings}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium px-6 py-2.5 rounded-xl shadow-lg transition-all duration-300 hover:shadow-indigo-500/20 active:scale-95 text-sm"
            >
              Save Settings
            </button>
            {saveStatus && (
              <span className="text-green-400 text-sm flex items-center gap-1.5 animate-pulse">
                <CheckCircle2 size={16} />
                {saveStatus}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Advanced / Maintenance Area */}
      <div className="bg-zinc-900/50 backdrop-blur-md border border-zinc-800/80 rounded-2xl p-6 md:p-8">
        <h3 className="text-lg font-bold font-display text-white mb-2 flex items-center gap-2">
          Maintenance & Reset
        </h3>
        <p className="text-xs text-zinc-400 mb-5 leading-relaxed">
          Manage system storage and clean up persistent assets. Wiping index databases will remove all vectors.
        </p>

        <div className="bg-red-950/10 border border-red-900/40 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex gap-3">
            <ShieldAlert className="text-red-500 shrink-0 mt-0.5" size={20} />
            <div>
              <h4 className="font-semibold text-sm text-red-200">Wipe Vector Database</h4>
              <p className="text-xs text-red-400/80 mt-1 leading-relaxed">
                This action will delete all PDF documents from server disk storage, clear all vector indices, and delete chunk maps. This is irreversible.
              </p>
            </div>
          </div>
          <button
            onClick={handleWipeDatabase}
            disabled={isWiping}
            className="bg-red-950/30 hover:bg-red-900/40 border border-red-800 text-red-200 hover:text-white font-semibold px-5 py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
          >
            <Trash2 size={14} />
            {isWiping ? "Wiping..." : "Wipe Database"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default SettingsSection;
