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
import { TrendingUp, TrendingDown } from "lucide-react";
import type { KpiTimeseriesPoint } from "@/types/conversation.types";

interface Props {
  data: KpiTimeseriesPoint[];
}

export function CostOverTimeChart({ data }: Props) {
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 768 : false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const totalCost = useMemo(() => data.reduce((sum, p) => sum + p.cost_usd, 0), [data]);
  
  // Trend calculation
  const trend = useMemo(() => {
    if (data.length < 2) return { value: "+0.0%", up: true };
    const mid = Math.floor(data.length / 2);
    const firstHalfSum = data.slice(0, mid).reduce((sum, p) => sum + p.cost_usd, 0);
    const secondHalfSum = data.slice(mid).reduce((sum, p) => sum + p.cost_usd, 0);
    
    if (firstHalfSum === 0) {
        return { value: secondHalfSum > 0 ? "+100%" : "0.0%", up: secondHalfSum > 0 };
    }
    
    const diff = ((secondHalfSum - firstHalfSum) / firstHalfSum) * 100;
    return {
      value: `${diff > 0 ? "+" : ""}${diff.toFixed(1)}%`,
      up: diff >= 0,
    };
  }, [data]);

  return (
    <div className="group relative flex flex-col rounded-[24px] bg-white/80 p-4 sm:p-6 shadow-[0_8px_30px_rgb(0,0,0,0.015)] ring-1 ring-slate-100 backdrop-blur-sm transition-all duration-500 hover:-translate-y-1.5 hover:shadow-[0_20px_50px_rgba(0,0,0,0.1)] hover:ring-slate-200 overflow-hidden">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-indigo-600"></div>
            <h3 className="text-[14px] font-bold tracking-tight text-slate-900">Cost Trends</h3>
          </div>
          <p className="mt-0.5 text-[11px] font-medium text-slate-400">Spending over time</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2 sm:gap-4">
          <div className="flex items-center gap-2 rounded-2xl bg-[#eff6ff] px-3 py-1.5 ring-1 ring-blue-100">
             <span className="text-[10px] font-bold uppercase tracking-tight text-blue-400">Total</span>
             <span className="text-[14px] sm:text-[15px] font-black text-blue-700">${totalCost.toFixed(2)}</span>
          </div>
          <div className={`flex items-center gap-2 rounded-2xl px-3 py-1.5 ring-1 ${
            trend.up 
              ? "bg-[#ecfdf5] ring-emerald-100" 
              : "bg-[#fef2f2] ring-red-100"
          }`}>
            {trend.up ? (
              <TrendingUp size={14} className="text-emerald-500" />
            ) : (
              <TrendingDown size={14} className="text-red-500" />
            )}
            <span className={`text-[14px] sm:text-[15px] font-black tracking-tight ${
              trend.up ? "text-emerald-600" : "text-red-600"
            }`}>
              {trend.value}
            </span>
          </div>
        </div>
      </div>

      <div className="h-[250px] sm:h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="costTrendGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
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
                return date.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                });
              }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#94a3b8", fontSize: 9, fontWeight: 700 }}
              tickFormatter={(v) => `$${v}`}
            />
            <Tooltip
              cursor={{ stroke: '#4f46e5', strokeWidth: 2, strokeDasharray: '5 5' }}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="rounded-2xl border border-slate-100 bg-white/95 p-3 shadow-2xl backdrop-blur-md ring-1 ring-slate-200/50">
                      <p className="mb-1 text-[10px] font-black uppercase tracking-wider text-slate-400">
                        {new Date(payload[0].payload.date + "T00:00:00").toLocaleDateString("en-US", {
                          day: "numeric",
                          month: "short",
                          year: "numeric"
                        })}
                      </p>
                      <p className="text-[14px] font-black text-indigo-600">
                         ${Number(payload[0].value).toFixed(2)}
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Area
              type="monotone"
              dataKey="cost_usd"
              stroke="#4f46e5"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#costTrendGradient)"
              animationDuration={1500}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
