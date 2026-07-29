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

export function AvgCallDurationChart({ data }: Props) {
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 768 : false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.round(secs % 60);
    if (m === 0) return `${s}s`;
    return `${m}m ${s}s`;
  };

  const stats = useMemo(() => {
    const total = data.reduce((sum, p) => sum + p.avg_call_duration_secs, 0);
    const avg = data.length > 0 ? total / data.length : 0;
    const peak = data.reduce((max, p) => Math.max(max, p.avg_call_duration_secs), 0);
    return { avg, peak };
  }, [data]);

  return (
    <div className="group relative flex flex-col rounded-[24px] bg-[#161722] p-4 sm:p-6 ring-1 ring-white/5 transition-all duration-500 hover:-translate-y-1.5 hover:ring-white/10 hover:shadow-[0_20px_50px_rgba(0,0,0,0.4)] overflow-hidden">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-amber-400 shadow-[0_0_8px_#F59E0B]"></div>
            <h3 className="text-[14px] font-bold tracking-tight text-white">Call Duration</h3>
          </div>
          <p className="mt-0.5 text-[11px] font-medium text-slate-500">Average call duration over time</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-4">
          <div className="flex items-center gap-2 rounded-2xl bg-amber-500/10 px-3 py-1.5 ring-1 ring-amber-500/20">
             <span className="text-[10px] font-bold uppercase tracking-tight text-amber-400">Avg</span>
             <span className="text-[14px] sm:text-[15px] font-black text-white">{formatDuration(stats.avg)}</span>
          </div>
          <div className="flex items-center gap-2 rounded-2xl bg-emerald-500/10 px-3 py-1.5 ring-1 ring-emerald-500/20">
              <span className="text-[10px] font-bold uppercase tracking-tight text-emerald-400">Peak</span>
              <span className="text-[14px] sm:text-[15px] font-black text-white">{formatDuration(stats.peak)}</span>
          </div>
        </div>
      </div>

      <div className="h-[250px] sm:h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="durationGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
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
                  return `${date.getDate()} ${date.toLocaleDateString("en-US", { month: "short" })}`;
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
              tickFormatter={(v) => `${Math.round(v)}s`}
              width={35}
            />
            <Tooltip
              cursor={{ stroke: '#F59E0B', strokeWidth: 2, strokeDasharray: '5 5' }}
              content={(props: any) => {
                const { active, payload } = props;
                if (active && payload && payload.length) {
                  return (
                    <div className="rounded-2xl border border-white/10 bg-[#1C1D2B] p-3 shadow-2xl shadow-black/50">
                      <p className="mb-1 text-[10px] font-black uppercase tracking-wider text-slate-500">
                        {new Date(payload[0].payload.date + "T00:00:00").toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric"
                        })}
                      </p>
                      <p className="text-[14px] font-black text-amber-400">
                        {formatDuration(Number(payload[0].value))}
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Area
              type="monotone"
              dataKey="avg_call_duration_secs"
              stroke="#F59E0B"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#durationGradient)"
              animationDuration={1500}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
