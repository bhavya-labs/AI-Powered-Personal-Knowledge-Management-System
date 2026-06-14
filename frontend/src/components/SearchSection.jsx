import { useState, useEffect } from "react";
import { Search, FileText, ChevronRight, AlertCircle, Sparkles } from "lucide-react";
import axios from "axios";
import { getApiBaseUrl } from "../config";

function SearchSection({ documents = [] }) {
  const [query, setQuery] = useState("");
  const [selectedDocId, setSelectedDocId] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;

    try {
      setLoading(true);
      setSearched(true);

      const savedEngine = localStorage.getItem("mindmesh_engine") || "local";
      const savedKey = localStorage.getItem("mindmesh_gemini_key") || "";
      
      const headers = {};
      if (savedEngine === "gemini" && savedKey) {
        headers["X-Gemini-API-Key"] = savedKey;
      }

      const response = await axios.post(`${getApiBaseUrl()}/search`, null, {
        params: {
          query: query,
          doc_id: selectedDocId || undefined
        },
        headers
      });

      setResults(response.data.results || []);
    } catch (error) {
      console.error("Semantic search failed:", error);
      const errorMsg = error.response?.data?.detail || "Semantic search failed";
      alert(`Search Error: ${errorMsg}`);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl animate-fade-in">
      {/* Search Bar & Filters */}
      <div className="bg-zinc-900/50 backdrop-blur-md border border-zinc-800/80 rounded-2xl p-6">
        <h3 className="text-xl font-bold font-display text-white mb-2 flex items-center gap-2">
          Semantic Search Engine
        </h3>
        <p className="text-xs text-zinc-400 mb-5 leading-relaxed">
          Search documents conceptually. Our vector algorithm finds relevant matches even if the exact keywords are different.
        </p>

        <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search concepts, questions, or topics in your documents..."
              className="w-full bg-zinc-950/80 text-white border border-zinc-800 hover:border-zinc-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all rounded-xl py-3 pl-12 pr-4 outline-none text-sm"
            />
          </div>
          
          <div className="flex gap-3">
            <select
              value={selectedDocId}
              onChange={(e) => setSelectedDocId(e.target.value)}
              className="bg-zinc-950/80 text-zinc-300 border border-zinc-800 hover:border-zinc-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all rounded-xl px-4 py-3 outline-none text-sm max-w-[200px]"
            >
              <option value="">All Documents</option>
              {documents.map((doc) => (
                <option key={doc.doc_id} value={doc.doc_id}>
                  {doc.filename}
                </option>
              ))}
            </select>

            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-3 rounded-xl transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none text-sm flex items-center gap-2 shadow-lg shadow-blue-500/10"
            >
              Search
            </button>
          </div>
        </form>
      </div>

      {/* Results Section */}
      <div className="space-y-4">
        {loading && (
          <div className="flex flex-col items-center justify-center py-16 space-y-3">
            <div className="w-10 h-10 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
            <p className="text-zinc-400 text-xs animate-pulse">Running semantic search...</p>
          </div>
        )}

        {!loading && searched && results.length === 0 && (
          <div className="bg-zinc-900/30 border border-zinc-800/80 rounded-2xl p-12 text-center flex flex-col items-center">
            <AlertCircle className="text-zinc-500 mb-3" size={40} />
            <h4 className="text-white font-medium text-sm mb-1">No conceptual matches found</h4>
            <p className="text-zinc-400 text-xs max-w-md leading-relaxed">
              We couldn't find any context matching "{query}". Try checking other documents or rephrase your search.
            </p>
          </div>
        )}

        {!loading && !searched && (
          <div className="bg-zinc-900/30 border border-zinc-800/80 rounded-2xl p-12 text-center flex flex-col items-center">
            <Sparkles className="text-blue-500/80 mb-3" size={32} />
            <h4 className="text-white font-medium text-sm mb-1">Concept-based Discovery</h4>
            <p className="text-zinc-400 text-xs max-w-sm leading-relaxed">
              Enter a question or topic above to explore matching chunks across your files.
            </p>
          </div>
        )}

        {!loading && results.length > 0 && (
          <div className="space-y-4">
            <h4 className="text-zinc-400 font-semibold text-xs tracking-wider uppercase pl-2">
              Search Results ({results.length})
            </h4>

            <div className="space-y-3">
              {results.map((result, index) => {
                const matchPercentage = Math.round(result.score * 100);
                
                return (
                  <div
                    key={index}
                    className="bg-zinc-900/50 backdrop-blur-md border border-zinc-800/80 hover:border-zinc-700/80 rounded-2xl p-5 transition-all duration-300 group"
                  >
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded bg-zinc-800 text-zinc-400">
                          <FileText size={16} />
                        </div>
                        <div>
                          <span className="text-sm font-semibold text-white group-hover:text-blue-400 transition-colors block max-w-xs md:max-w-md truncate">
                            {result.filename}
                          </span>
                          <span className="text-xs text-zinc-500">
                            Page {result.page}
                          </span>
                        </div>
                      </div>

                      <span className={`text-xs font-mono font-bold px-2.5 py-1 rounded-full ${
                        matchPercentage > 85 
                          ? "bg-green-500/10 text-green-400 border border-green-500/20" 
                          : matchPercentage > 70 
                            ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                            : "bg-zinc-800 text-zinc-400 border border-zinc-700"
                      }`}>
                        {matchPercentage}% Match
                      </span>
                    </div>

                    <p className="text-sm text-zinc-300 leading-relaxed pl-1 whitespace-pre-wrap">
                      {result.text}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default SearchSection;
