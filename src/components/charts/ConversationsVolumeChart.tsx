import { useMemo, useState, useEffect } from "react";
import {
  AreaChart,
  Area,
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

export function ConversationsVolumeChart({ data }: Props) {
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 768 : false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const stats = useMemo(() => {
    const total = data.reduce((sum, p) => sum + p.conversations, 0);
    const avg = data.length > 0 ? total / data.length : 0;
    
    let peakVal = 0;
    let peakDate = "";
    data.forEach(p => {
      if (p.conversations > peakVal) {
        peakVal = p.conversations;
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
            <div className="h-2 w-2 rounded-full bg-[#8B5CF6] shadow-[0_0_8px_#8B5CF6]"></div>
            <h3 className="text-[14px] font-bold tracking-tight text-white">Conversation Volume</h3>
          </div>
          <p className="mt-0.5 text-[11px] font-medium text-slate-500">Daily call volume trend</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-4">
          <div className="flex items-center gap-2 rounded-2xl bg-[#8B5CF6]/10 px-3 py-1.5 ring-1 ring-[#8B5CF6]/20">
            <span className="text-[10px] font-bold uppercase tracking-tight text-[#B79BFF]">Total Calls</span>
            <span className="text-[14px] sm:text-[15px] font-black text-white">{stats.total}</span>
          </div>
          <div className="flex items-center gap-2 rounded-2xl bg-white/[0.03] px-3 py-1.5 ring-1 ring-white/5">
            <span className="text-[10px] font-bold uppercase tracking-tight text-slate-500">Peak</span>
            <span className="text-[14px] sm:text-[15px] font-black text-slate-200">{stats.peakVal} <span className="text-[9px] text-slate-500">({stats.peakDate})</span></span>
          </div>
        </div>
      </div>

      <div className="h-[250px] sm:h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart 
            data={data} 
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorCalls" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.35}/>
                <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/>
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
              tickFormatter={(v) => {
                const date = new Date(v + "T00:00:00");
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
                      <p className="text-[12px] font-bold text-[#B79BFF]">
                        Calls : {payload[0].value}
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Area
              type="monotone"
              dataKey="conversations"
              stroke="#8B5CF6"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#colorCalls)"
              animationDuration={1500}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
