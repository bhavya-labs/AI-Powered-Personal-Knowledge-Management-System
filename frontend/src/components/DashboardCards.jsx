import { FileText, BookOpen, Database } from "lucide-react";

function DashboardCards({ stats = { documents: 0, pages: 0, chunks: 0 } }) {
  const cards = [
    {
      title: "Active Documents",
      value: stats.documents,
      desc: "Indexed PDFs in database",
      icon: <FileText className="text-blue-400" size={20} />,
      color: "from-blue-500/10 to-indigo-500/5 border-blue-500/20",
    },
    {
      title: "Total Pages",
      value: stats.pages,
      desc: "Pages processed & read",
      icon: <BookOpen className="text-violet-400" size={20} />,
      color: "from-violet-500/10 to-purple-500/5 border-violet-500/20",
    },
    {
      title: "Index Chunks",
      value: stats.chunks,
      desc: "FAISS vectors constructed",
      icon: <Database className="text-emerald-400" size={20} />,
      color: "from-emerald-500/10 to-teal-500/5 border-emerald-500/20",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
      {cards.map((card, index) => (
        <div
          key={index}
          className={`bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6 hover:scale-[1.02] hover:-translate-y-0.5 hover:bg-zinc-900/60 transition-all duration-300 flex items-start justify-between gap-4`}
        >
          <div>
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">{card.title}</p>
            <h3 className="text-4xl font-bold font-display text-white mt-3 mb-1">
              {card.value}
            </h3>
            <p className="text-[10px] text-zinc-500 mt-1 leading-relaxed">{card.desc}</p>
          </div>
          <div className="p-3 bg-zinc-950/80 border border-zinc-850 rounded-xl">
            {card.icon}
          </div>
        </div>
      ))}
    </div>
  );
}

export default DashboardCards;