import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import type { KpiTimeseriesPoint } from "@/types/conversation.types";

interface Props {
  data: KpiTimeseriesPoint[];
}

export function LeadsCapturedChart({ data }: Props) {
  const totalLeads = useMemo(() => {
    return data.reduce((sum, p) => sum + (p.leads_captured || 0), 0);
  }, [data]);

  return (
    <div className="group relative flex flex-col rounded-[24px] bg-white/80 p-4 sm:p-6 shadow-[0_8px_30px_rgb(0,0,0,0.015)] ring-1 ring-slate-100 backdrop-blur-sm transition-all duration-500 hover:-translate-y-1.5 hover:shadow-[0_20px_50px_rgba(0,0,0,0.1)] hover:ring-slate-200 overflow-hidden">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
            <h3 className="text-[14px] font-bold tracking-tight text-slate-900">Leads Captured</h3>
          </div>
          <p className="mt-0.5 text-[11px] font-medium text-slate-400">Total qualified leads found</p>
        </div>
        <div className="rounded-2xl bg-emerald-50 px-3 py-1.5 ring-1 ring-emerald-100">
           <span className="text-[13px] font-black text-emerald-600">{totalLeads} Leads</span>
        </div>
      </div>

      <div className="h-[200px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#64748b", fontSize: 9, fontWeight: 700 }}
              tickFormatter={(v) => new Date(v + "T00:00:00").toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
            />
            <YAxis hide />
            <Tooltip
              content={(props: any) => {
                const { active, payload } = props;
                if (active && payload && payload.length) {
                  return (
                    <div className="rounded-xl border border-[#e5e7eb] bg-white p-2 shadow-sm">
                      <p className="text-[10px] font-bold text-emerald-600">{payload[0].value} Leads</p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar
              dataKey="leads_captured"
              fill="#10b981"
              radius={[4, 4, 0, 0]}
              animationDuration={1500}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
