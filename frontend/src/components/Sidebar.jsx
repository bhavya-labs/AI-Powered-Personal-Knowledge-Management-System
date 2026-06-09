import {
  LayoutDashboard,
  Upload,
  MessageSquare,
  Search,
  Settings,
  Sparkles,
} from "lucide-react";

function Sidebar({ activeTab = "dashboard", setActiveTab }) {
  const menuItems = [
    {
      id: "dashboard",
      name: "Dashboard",
      icon: <LayoutDashboard size={18} />,
    },
    {
      id: "upload",
      name: "Upload Notes",
      icon: <Upload size={18} />,
    },
    {
      id: "chat",
      name: "AI Chat Room",
      icon: <MessageSquare size={18} />,
    },
    {
      id: "search",
      name: "Semantic Search",
      icon: <Search size={18} />,
    },
    {
      id: "settings",
      name: "System Settings",
      icon: <Settings size={18} />,
    },
  ];

  return (
    <div className="w-64 h-screen bg-zinc-950 border-r border-zinc-900/80 p-6 flex flex-col shrink-0">
      {/* Brand logo header */}
      <div className="flex items-center gap-3 mb-10 pl-2">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
          <Sparkles className="text-white" size={16} />
        </div>
        <div>
          <h1 className="text-lg font-black font-display text-white tracking-wider">
            Assistant <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">AI</span>
          </h1>
          <span className="text-[10px] text-zinc-550 block font-semibold -mt-0.5">RAG PLATFORM v1.0</span>
        </div>
      </div>

      {/* Nav Menu Items */}
      <nav className="flex-1 space-y-2">
        {menuItems.map((item) => {
          const isActive = activeTab === item.id;

          return (
            <div
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center gap-3.5 px-4 py-3 rounded-xl cursor-pointer transition-all duration-300 ${isActive
                  ? "bg-gradient-to-r from-zinc-900 to-zinc-900/60 text-blue-400 border-l-2 border-blue-500 font-semibold"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/30"
                }`}
            >
              <span className={isActive ? "text-blue-400" : "text-zinc-550 group-hover:text-zinc-350"}>
                {item.icon}
              </span>
              <span className="text-xs tracking-wide">{item.name}</span>
            </div>
          );
        })}
      </nav>

      {/* Footer system spec indicator */}
      <div className="pt-4 border-t border-zinc-900/80 pl-2">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
          <span className="text-[10px] font-bold text-zinc-400 tracking-wide uppercase">Core Active</span>
        </div>
        <p className="text-[9px] text-zinc-550 mt-1 leading-relaxed">
          FAISS Vector Engine Local
        </p>
      </div>
    </div>
  );
}

export default Sidebar;