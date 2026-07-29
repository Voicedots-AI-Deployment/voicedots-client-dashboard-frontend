import { useMemo } from "react";
import {
  LineChart,
  Line,
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

export function EngagementChart({ data }: Props) {
  const engagementData = useMemo(() => {
    return data.map(p => ({
      date: p.date,
      engagement: p.conversations > 0 ? Number((p.messages / p.conversations).toFixed(1)) : 0
    }));
  }, [data]);

  const avgEngagement = useMemo(() => {
    const valid = engagementData.filter(d => d.engagement > 0);
    if (!valid.length) return 0;
    return (valid.reduce((sum, d) => sum + d.engagement, 0) / valid.length).toFixed(1);
  }, [engagementData]);

  return (
    <div className="group relative flex flex-col rounded-[24px] bg-[#161722] p-4 sm:p-6 ring-1 ring-white/5 transition-all duration-500 hover:-translate-y-1.5 hover:ring-white/10 hover:shadow-[0_20px_50px_rgba(0,0,0,0.4)] overflow-hidden">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-[#8B5CF6] shadow-[0_0_8px_#8B5CF6]"></div>
            <h3 className="text-[14px] font-bold tracking-tight text-white">Engagement Rate</h3>
          </div>
          <p className="mt-0.5 text-[11px] font-medium text-slate-500">Avg messages per conversation</p>
        </div>
        <div className="rounded-2xl bg-[#8B5CF6]/10 px-3 py-1.5 ring-1 ring-[#8B5CF6]/20">
           <span className="text-[13px] font-black text-[#B79BFF]">{avgEngagement} msgs/call</span>
        </div>
      </div>

      <div className="h-[200px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={engagementData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
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
              content={(props: any) => {
                const { active, payload } = props;
                if (active && payload && payload.length) {
                  return (
                    <div className="rounded-xl border border-white/10 bg-[#1C1D2B] p-2 shadow-2xl shadow-black/50">
                      <p className="text-[10px] font-bold text-[#B79BFF]">{payload[0].value} msgs/call</p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Line
              type="monotone"
              dataKey="engagement"
              stroke="#8B5CF6"
              strokeWidth={3}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
              animationDuration={1500}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
