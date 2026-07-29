import {
  MessageSquare,
  BarChart3,
} from "lucide-react";

type KpiProps = {
  totalConversations: number;
  totalMessages: number;
};

function KpiCard({
  icon,
  label,
  value,
  variant = "default",
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  variant?: "default" | "success";
}) {
  const styles = {
    default: {
      bg: "bg-indigo-50/30",
      border: "border-indigo-100",
      iconBg: "bg-indigo-600",
      iconColor: "text-white",
      text: "text-indigo-600"
    },
    success: {
      bg: "bg-emerald-50/30",
      border: "border-emerald-100",
      iconBg: "bg-emerald-600",
      iconColor: "text-white",
      text: "text-emerald-600"
    }
  };

  const style = styles[variant];

  return (
    <div
      className={`
        bg-white border ${style.border} rounded-2xl
        px-6 py-5 flex items-center gap-5
        transition-all duration-300 hover:shadow-xl hover:shadow-indigo-500/5 hover:-translate-y-0.5
      `}
    >
      <div className={`p-3.5 rounded-2xl ${style.iconBg} ${style.iconColor} shadow-lg ${variant === 'default' ? 'shadow-indigo-100' : 'shadow-emerald-100'} shrink-0`}>
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
  totalMessages,
}: KpiProps) {
  return (
    <div className="grid grid-cols-2 gap-4 md:gap-8">
      <KpiCard
        icon={<BarChart3 size={24} />}
        label="Conversations"
        value={totalConversations}
        variant="default"
      />
      <KpiCard
        icon={<MessageSquare size={24} />}
        label="Messages"
        value={totalMessages}
        variant="success"
      />
    </div>
  );
}
