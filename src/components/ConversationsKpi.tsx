import {
  BarChart3,
} from "lucide-react";

type KpiProps = {
  totalConversations: number;
};

function KpiCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
}) {
  const style = {
    bg: "bg-indigo-50/30",
    border: "border-indigo-100",
    iconBg: "bg-indigo-600",
    iconColor: "text-white",
    text: "text-indigo-600"
  };

  return (
    <div
      className={`
        bg-white border ${style.border} rounded-2xl
        px-6 py-5 flex items-center gap-5
        transition-all duration-300 hover:shadow-xl hover:shadow-indigo-500/5 hover:-translate-y-0.5
        dark:bg-slate-900
      `}
    >
      <div className={`p-3.5 rounded-2xl ${style.iconBg} ${style.iconColor} shadow-lg shadow-indigo-100 shrink-0 dark:shadow-none`}>
        {icon}
      </div>

      <div className="leading-tight">
        <p className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-1">
          {label}
        </p>
        <p className={`text-3xl font-black ${style.text}`}>
          {value.toLocaleString()}
        </p>
      </div>
    </div>
  );
}

export function ConversationsKpi({
  totalConversations,
}: KpiProps) {
  return (
    <div className="grid grid-cols-1 gap-4 md:gap-8">
      <KpiCard
        icon={<BarChart3 size={24} />}
        label="Conversations"
        value={totalConversations}
      />
    </div>
  );
}
