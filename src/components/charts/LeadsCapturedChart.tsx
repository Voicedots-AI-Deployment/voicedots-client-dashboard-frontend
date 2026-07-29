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
    <div className="group relative flex flex-col rounded-[24px] bg-[#161722] p-4 sm:p-6 ring-1 ring-white/5 transition-all duration-500 hover:-translate-y-1.5 hover:ring-white/10 hover:shadow-[0_20px_50px_rgba(0,0,0,0.4)] overflow-hidden">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34D399]"></div>
            <h3 className="text-[14px] font-bold tracking-tight text-white">Leads Captured</h3>
          </div>
          <p className="mt-0.5 text-[11px] font-medium text-slate-500">Total qualified leads found</p>
        </div>
        <div className="rounded-2xl bg-emerald-500/10 px-3 py-1.5 ring-1 ring-emerald-500/20">
           <span className="text-[13px] font-black text-emerald-400">{totalLeads} Leads</span>
        </div>
      </div>

      <div className="h-[200px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#34D399" stopOpacity={1} />
                <stop offset="100%" stopColor="#059669" stopOpacity={0.5} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#2A2B3D" />
            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#64748b", fontSize: 9, fontWeight: 700 }}
              tickFormatter={(v) => new Date(v + "T00:00:00").toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
            />
            <YAxis hide />
            <Tooltip
              cursor={{ fill: 'rgba(255, 255, 255, 0.04)' }}
              content={(props: any) => {
                const { active, payload } = props;
                if (active && payload && payload.length) {
                  return (
                    <div className="rounded-xl border border-white/10 bg-[#1C1D2B] p-2 shadow-2xl shadow-black/50">
                      <p className="text-[10px] font-bold text-emerald-400">{payload[0].value} Leads</p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar
              dataKey="leads_captured"
              fill="url(#colorLeads)"
              radius={[4, 4, 0, 0]}
              animationDuration={1500}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
