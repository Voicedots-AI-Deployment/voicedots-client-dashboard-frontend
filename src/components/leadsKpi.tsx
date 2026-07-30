import {
  Users,
  CheckCircle,
} from "lucide-react";

type KpiProps = {
  totalLeads: number;
  qualifiedLeads: number;
};

function KpiCard({
  icon,
  label,
  value,
  variant = "default",
  vertical = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  variant?: "default" | "success";
  vertical?: boolean;
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
        px-6 py-5 flex transition-all duration-300 hover:shadow-lg hover:shadow-indigo-500/5 hover:-translate-y-0.5
        ${
          vertical
            ? "flex-col items-center text-center gap-3"
            : "flex-row items-center gap-5"
        }
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

export function LeadsKpi({
  totalLeads,
  qualifiedLeads,
}: KpiProps) {
  return (
    <div className="grid grid-cols-2 gap-4 md:gap-8">
      <KpiCard
        icon={<Users size={24} />}
        label="Total Leads"
        value={totalLeads}
        variant="default"
      />
      <KpiCard
        icon={<CheckCircle size={24} />}
        label="Qualified Leads"
        value={qualifiedLeads}
        variant="success"
      />
    </div>
  );
}
