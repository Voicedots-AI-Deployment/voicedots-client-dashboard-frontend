import { useMemo, useState, useEffect } from "react";
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

export function ConversationsPerDayChart({ data }: Props) {
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 768 : false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const stats = useMemo(() => {
    const total = data.reduce((sum, p) => sum + p.messages, 0);
    const avg = data.length > 0 ? total / data.length : 0;
    
    let peakVal = 0;
    let peakDate = "";
    data.forEach(p => {
      if (p.messages > peakVal) {
        peakVal = p.messages;
        peakDate = new Date(p.date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
      }
    });

    return { total, avg, peakVal, peakDate };
  }, [data]);

  return (
    <div className="group relative flex flex-col rounded-[24px] bg-[#161722] p-4 sm:p-6 ring-1 ring-white/5 transition-all duration-500 hover:-translate-y-1.5 hover:ring-white/10 hover:shadow-[0_20px_50px_rgba(0,0,0,0.4)] overflow-hidden">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-[#22D3EE] shadow-[0_0_8px_#22D3EE]"></div>
            <h3 className="text-[14px] font-bold tracking-tight text-white">Message Volume</h3>
          </div>
          <p className="mt-0.5 text-[11px] font-medium text-slate-500">Daily message volume</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-4">
          <div className="flex items-center gap-2 rounded-2xl bg-[#22D3EE]/10 px-3 py-1.5 ring-1 ring-[#22D3EE]/20">
            <span className="text-[10px] font-bold uppercase tracking-tight text-[#67E8F9]">Total</span>
            <span className="text-[14px] sm:text-[15px] font-black text-white">{stats.total}</span>
          </div>
          <div className="flex items-center gap-2 rounded-2xl bg-[#8B5CF6]/10 px-3 py-1.5 ring-1 ring-[#8B5CF6]/20">
            <span className="text-[10px] font-bold uppercase tracking-tight text-[#B79BFF]">Avg/Day</span>
            <span className="text-[14px] sm:text-[15px] font-black text-white">{stats.avg.toFixed(1)}</span>
          </div>
          <div className="flex items-center gap-2 rounded-2xl bg-emerald-500/10 px-3 py-1.5 ring-1 ring-emerald-500/20">
             <div className="flex items-center gap-1.5 leading-none">
                <span className="text-[10px] font-bold uppercase tracking-tight text-emerald-400">Peak</span>
                <span className="text-[9px] font-bold text-emerald-500/70">({stats.peakDate})</span>
             </div>
            <span className="text-[14px] sm:text-[15px] font-black text-white">{stats.peakVal}</span>
          </div>
        </div>
      </div>

      <div className="h-[250px] sm:h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart 
            data={data} 
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            barCategoryGap="8%"
          >
            <defs>
              <linearGradient id="colorMessages" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22D3EE" stopOpacity={1} />
                <stop offset="100%" stopColor="#0EA5E9" stopOpacity={0.5} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#2A2B3D" />
            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#64748b", fontSize: isMobile ? 7 : 10, fontWeight: 700 }}
              dy={10}
              interval={isMobile ? 0 : "preserveStartEnd"}
              angle={isMobile ? -45 : 0}
              textAnchor={isMobile ? "end" : "middle"}
              height={isMobile ? 50 : 30}
              tickFormatter={(v) => {
                // Ensure we parse the string as local midnight to avoid timezone shifts
                const date = new Date(v + "T00:00:00");
                if (isMobile) {
                  return `${date.getDate()} ${date.toLocaleDateString("en-IN", { month: "short" })}`;
                }
                return date.toLocaleDateString("en-IN", {
                  month: "short",
                  day: "numeric",
                });
              }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#64748b", fontSize: 9, fontWeight: 700 }}
              width={35}
            />
            <Tooltip
              cursor={{ fill: 'rgba(255, 255, 255, 0.04)' }}
              content={(props: any) => {
                const { active, payload } = props;
                if (active && payload && payload.length) {
                  return (
                    <div className="rounded-xl border border-white/10 bg-[#1C1D2B] p-3 shadow-2xl shadow-black/50">
                      <p className="mb-1 text-[12px] font-medium text-slate-400">
                        {new Date(payload[0].payload.date + "T00:00:00").toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric"
                        })}
                      </p>
                      <p className="text-[12px] font-bold text-[#67E8F9]">
                        Messages : {payload[0].value}
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar
              dataKey="messages"
              fill="url(#colorMessages)"
              radius={[6, 6, 0, 0]}
              maxBarSize={100}
              animationDuration={1500}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
