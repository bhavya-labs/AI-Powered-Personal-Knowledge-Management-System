import { useState, useEffect } from "react";
import { Radio, Cpu, CloudLightning } from "lucide-react";

function Header({ activeTab = "dashboard", isServerOnline = true }) {
  const [engine, setEngine] = useState("local");

  useEffect(() => {
    // Check engine mode periodically
    const checkEngine = () => {
      const savedEngine = localStorage.getItem("mindmesh_engine") || "local";
      setEngine(savedEngine);
    };

    checkEngine();
    const interval = setInterval(checkEngine, 2000);
    return () => clearInterval(interval);
  }, []);

  const getTitles = () => {
    switch (activeTab) {
      case "dashboard":
        return {
          title: "System Overview",
          subtitle: "Welcome back to MindMesh AI dashboard",
        };
      case "upload":
        return {
          title: "Document Repository",
          subtitle: "Manage, summarize, and index your PDF documents",
        };
      case "chat":
        return {
          title: "AI Chat Assistant",
          subtitle: "Chat with your vector-indexed documents in real-time",
        };
      case "search":
        return {
          title: "Semantic Explorer",
          subtitle: "Find concepts and quotes across your files using AI embedding search",
        };
      case "settings":
        return {
          title: "System Configuration",
          subtitle: "Configure API engines, tokens, and storage resets",
        };
      default:
        return {
          title: "Dashboard",
          subtitle: "Welcome back to MindMesh AI",
        };
    }
  };

  const { title, subtitle } = getTitles();

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-5 border-b border-zinc-900">
      <div>
        <h2 className="text-3xl font-extrabold font-display text-white tracking-tight">
          {title}
        </h2>
        <p className="text-sm text-zinc-400 mt-1.5 leading-relaxed font-sans">
          {subtitle}
        </p>
      </div>

      <div className="flex items-center gap-3 self-start sm:self-center">
        {/* API Engine Status */}
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[11px] font-semibold ${
          engine === "gemini"
            ? "bg-indigo-500/10 border-indigo-500/20 text-indigo-400"
            : "bg-blue-500/10 border-blue-500/20 text-blue-400"
        }`}>
          {engine === "gemini" ? (
            <>
              <CloudLightning size={12} />
              <span>Gemini Engine</span>
            </>
          ) : (
            <>
              <Cpu size={12} />
              <span>Local CPU Engine</span>
            </>
          )}
        </div>

        {/* Server Connection Status */}
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[11px] font-semibold ${
          isServerOnline
            ? "bg-green-500/10 border-green-500/20 text-green-400"
            : "bg-red-500/10 border-red-500/20 text-red-400 animate-pulse"
        }`}>
          <Radio size={12} className={isServerOnline ? "animate-pulse" : ""} />
          <span>{isServerOnline ? "Server Online" : "Server Offline"}</span>
        </div>
      </div>
    </div>
  );
}

export default Header;