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
    <div className="group relative flex flex-col rounded-[24px] bg-white/80 p-4 sm:p-6 shadow-[0_8px_30px_rgb(0,0,0,0.015)] ring-1 ring-slate-100 backdrop-blur-sm transition-all duration-500 hover:-translate-y-1.5 hover:shadow-[0_20px_50px_rgba(0,0,0,0.1)] hover:ring-slate-200 overflow-hidden">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-amber-500"></div>
            <h3 className="text-[14px] font-bold tracking-tight text-slate-900">Call Duration</h3>
          </div>
          <p className="mt-0.5 text-[11px] font-medium text-slate-400">Average call duration over time</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-4">
          <div className="flex items-center gap-2 rounded-2xl bg-[#fffbeb] px-3 py-1.5 ring-1 ring-amber-100">
             <span className="text-[10px] font-bold uppercase tracking-tight text-amber-500">Avg</span>
             <span className="text-[14px] sm:text-[15px] font-black text-[#d97706]">{formatDuration(stats.avg)}</span>
          </div>
          <div className="flex items-center gap-2 rounded-2xl bg-[#ecfdf5] px-3 py-1.5 ring-1 ring-emerald-100">
              <span className="text-[10px] font-bold uppercase tracking-tight text-emerald-500">Peak</span>
              <span className="text-[14px] sm:text-[15px] font-black text-emerald-700">{formatDuration(stats.peak)}</span>
          </div>
        </div>
      </div>

      <div className="h-[250px] sm:h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="durationGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#94a3b8", fontSize: isMobile ? 7 : 10, fontWeight: 700 }}
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
              tick={{ fill: "#94a3b8", fontSize: 9, fontWeight: 700 }}
              tickFormatter={(v) => `${Math.round(v)}s`}
              width={35}
            />
            <Tooltip
              cursor={{ stroke: '#ea580c', strokeWidth: 2, strokeDasharray: '5 5' }}
              content={(props: any) => {
                const { active, payload } = props;
                if (active && payload && payload.length) {
                  return (
                    <div className="rounded-2xl border border-slate-100 bg-white/95 p-3 shadow-2xl backdrop-blur-md ring-1 ring-slate-200/50">
                      <p className="mb-1 text-[10px] font-black uppercase tracking-wider text-slate-400">
                        {new Date(payload[0].payload.date + "T00:00:00").toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric"
                        })}
                      </p>
                      <p className="text-[14px] font-black text-amber-600">
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
              stroke="#ea580c"
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
