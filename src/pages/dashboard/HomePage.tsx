import { motion } from "framer-motion";
import {
  MessageSquare,
  Activity,
  Calendar,
  Clock,
} from "lucide-react";
import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { kpiAPI } from "@/api/kpi";
import { UI } from "@/ui/colors";
import type { KpiTimeseriesPoint } from "@/types/conversation.types";
import { ConversationsPerDayChart } from "@/components/charts/ConversationsPerDayChart";
import { ConversationsVolumeChart } from "@/components/charts/ConversationsVolumeChart";
import { EngagementChart } from "@/components/charts/EngagementChart";
import { LeadsCapturedChart } from "@/components/charts/LeadsCapturedChart";
import { AvgCallDurationChart } from "@/components/charts/AvgCallDurationChart";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Tooltip,
} from "recharts";

/* ================= TYPES & HELPERS ================= */

type Preset = "7d" | "15d" | "30d" | "all" | "custom";

// Official integration began March 23rd, 2026. 
// Do not start counts before this to avoid skewed percentages.
const INTEGRATION_DATE = "2026-03-23";

const formatHours = (secs = 0) => `${(secs / 3600).toFixed(1)}h`;

const getSafeLocalDate = (dateInput: string | Date) => {
  const d = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return null;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getRangeFromPreset = (preset: Preset) => {
  const end = new Date();
  const start = new Date();

  switch (preset) {
    case "7d": start.setDate(end.getDate() - 6); break;
    case "15d": start.setDate(end.getDate() - 14); break;
    case "30d": start.setDate(end.getDate() - 29); break;
    case "all": start.setTime(new Date(INTEGRATION_DATE).getTime()); break;
  }

  const startStr = getSafeLocalDate(start) || start.toISOString().slice(0, 10);
  const endStr = getSafeLocalDate(end) || end.toISOString().slice(0, 10);

  // Clamp to INTEGRATION_DATE if preset would go before it
  return {
    from: startStr < INTEGRATION_DATE ? INTEGRATION_DATE : startStr,
    to: endStr,
  };
};

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0 },
};

/* ================= COMPONENTS ================= */

const MiniSparkline = ({ data, color, formatter }: { data: any[], color: string, formatter?: (v: number) => string }) => (
  <div className="h-10 w-24">
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data}>
        <defs>
          <linearGradient id={`gradient-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.15} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Tooltip
          content={(props: any) => {
            const { active, payload } = props;
            if (active && payload && payload.length) {
              const val = Number(payload[0].value);
              return (
                <div className="rounded-lg bg-slate-900 px-2 py-1 text-[10px] text-white shadow-xl ring-1 ring-white/20 whitespace-nowrap">
                  {formatter ? formatter(val) : val.toLocaleString()}
                </div>
              );
            }
            return null;
          }}
          cursor={false}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={1.5}
          fill={`url(#gradient-${color.replace('#', '')})`}
          fillOpacity={1}
          isAnimationActive={false}
          activeDot={{ r: 3, strokeWidth: 0, fill: color }}
        />
      </AreaChart>
    </ResponsiveContainer>
  </div>
);

/* ================= MAIN PAGE ================= */

export function HomePage() {
  const { user } = useAuth();
  const [timeseries, setTimeseries] = useState<KpiTimeseriesPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [preset, setPreset] = useState<Preset>("7d");
  const [{ from, to }, setRange] = useState(() => getRangeFromPreset("7d"));
  const pollTimer = useRef<any>(null);

  const fetchKPIs = useCallback(async (isSilent = false) => {
    if (!user?.agent_id) return;
    if (!isSilent) setLoading(true);
    try {
      const res = await kpiAPI.getKpis(user.agent_id);
      setTimeseries(res.timeseries);
    } catch (err) {
      console.error("Failed to fetch KPIs:", err);
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, [user?.agent_id]);

  useEffect(() => {
    fetchKPIs();
    pollTimer.current = setInterval(() => fetchKPIs(true), 10000); // 10 sec polling for realtime
    return () => { if (pollTimer.current) clearInterval(pollTimer.current); };
  }, [fetchKPIs, user?.agent_id]);

  const handlePresetChange = useCallback((p: Preset) => {
    setPreset(p);
    if (p === "custom") return;

    if (p === "all" && timeseries.length > 0) {
      const dates = timeseries.map(pt => new Date(pt.date).getTime());
      setRange({
        from: getSafeLocalDate(new Date(Math.min(...dates))) || "2020-01-01",
        to: getSafeLocalDate(new Date()) || new Date().toISOString().slice(0, 10)
      });
    } else {
      setRange(getRangeFromPreset(p));
    }
  }, [timeseries]);

  const filteredData = useMemo(() => {
    if (!timeseries.length) return [];

    // Filter out data before integration to ensure accuracy
    const activeData = timeseries.filter(pt => {
      const d = getSafeLocalDate(pt.date);
      return d && d >= INTEGRATION_DATE;
    });

    if (preset === "all") {
      return activeData
        .filter(p => {
          const d = getSafeLocalDate(p.date);
          return d && d >= from && d <= to;
        })
        .map(p => ({
          ...p,
          date: getSafeLocalDate(p.date) || p.date,
          avg_call_duration_secs: p.avg_call_duration_secs ?? 0
        }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }

    const pointsMap = new Map<string, KpiTimeseriesPoint>();
    activeData.forEach(p => {
      const d = getSafeLocalDate(p.date);
      if (d) pointsMap.set(d, p);
    });

    const result: KpiTimeseriesPoint[] = [];
    let curr = new Date(from + "T00:00:00");
    const end = new Date(to + "T00:00:00");

    while (curr <= end) {
      const dStr = getSafeLocalDate(curr);
      if (!dStr) break;

      const existing = pointsMap.get(dStr);
      result.push(existing ? {
        ...existing,
        date: dStr,
        avg_call_duration_secs: existing.avg_call_duration_secs ?? 0
      } : {
        date: dStr,
        conversations: 0,
        cost_usd: 0,
        messages: 0,
        total_call_duration_secs: 0,
        avg_call_duration_secs: 0
      });
      curr.setDate(curr.getDate() + 1);
    }
    return result;
  }, [timeseries, from, to, preset]);

  const computeMetrics = useCallback((data: KpiTimeseriesPoint[]) => {
    const metrics = data.reduce((acc, p) => ({
      conversations: acc.conversations + p.conversations,
      cost: acc.cost + p.cost_usd,
      messages: acc.messages + p.messages,
      totalDuration: acc.totalDuration + p.total_call_duration_secs,
    }), { conversations: 0, cost: 0, messages: 0, totalDuration: 0 });

    return {
      ...metrics,
      avgCost: metrics.conversations > 0 ? metrics.cost / metrics.conversations : 0
    };
  }, []);

  const previousMetrics = useMemo(() => {
    const curM = computeMetrics(filteredData);
    if (!timeseries.length || filteredData.length < 2) return { current: curM, previous: curM };

    // Filter timeseries for valid records post-integration
    const activeHistory = timeseries.filter(p => {
      const d = getSafeLocalDate(p.date);
      return d && d >= INTEGRATION_DATE;
    });

    // Determine account age based on INTEGRATION date
    const allDates = activeHistory.map(p => new Date(p.date).getTime());
    if (!allDates.length) return { current: curM, previous: curM };

    const firstDate = Math.min(...allDates);
    const today = new Date().getTime();
    const accountAgeDays = (today - firstDate) / 86400000;
    const periodDays = (new Date(to).getTime() - new Date(from).getTime()) / 86400000;

    // Use Split-Half internal growth if account history is less than 1.5x the period
    const mid = Math.floor(filteredData.length / 2);
    const splitCurrent = computeMetrics(filteredData.slice(mid));
    const splitPrevious = computeMetrics(filteredData.slice(0, mid));

    if (preset === "all" || accountAgeDays < (periodDays * 1.5)) {
      return { current: splitCurrent, previous: splitPrevious };
    }

    const fromTime = new Date(from + "T00:00:00").getTime();
    const durationMs = new Date(to + "T00:00:00").getTime() - fromTime;
    const prevTo = getSafeLocalDate(new Date(fromTime - 86400000));
    const prevFrom = getSafeLocalDate(new Date(fromTime - durationMs - 86400000));

    const prevData = activeHistory.filter(p => {
      const d = getSafeLocalDate(p.date);
      return d && prevFrom && prevTo && d >= prevFrom && d <= prevTo;
    });

    const prevM = computeMetrics(prevData);
    if (prevM.conversations < (curM.conversations * 0.05) && prevM.conversations < 10) {
      return { current: splitCurrent, previous: splitPrevious };
    }

    return { current: curM, previous: prevM };
  }, [timeseries, from, to, preset, filteredData, computeMetrics]);

  const getTrend = (key: keyof ReturnType<typeof computeMetrics>) => {
    if (!previousMetrics) return { text: "0.0%", up: true };
    const cur = previousMetrics.current[key];
    const prev = previousMetrics.previous[key];
    if (prev === 0) return { text: cur > 0 ? "+100%" : "0.0%", up: true };
    const diff = ((cur - prev) / prev) * 100;
    const val = diff > 999 ? 999 : diff < -999 ? -999 : diff;
    return { text: `${val >= 0 ? '+' : ''}${val.toFixed(1)}%`, up: diff >= 0 };
  };

  const currentStats = useMemo(() => computeMetrics(filteredData), [filteredData, computeMetrics]);

  const stats = [
    { label: "TOTAL CONVERSATIONS", value: loading ? "—" : currentStats.conversations.toLocaleString(), icon: MessageSquare, trend: getTrend("conversations"), dataKey: "conversations", format: (v: number) => `${v} convs` },
    { label: "TOTAL MESSAGES", value: loading ? "—" : currentStats.messages.toLocaleString(), icon: Activity, trend: getTrend("messages"), dataKey: "messages", format: (v: number) => `${v.toLocaleString()} msgs` },
    { label: "TOTAL DURATION", value: loading ? "—" : formatHours(currentStats.totalDuration), icon: Clock, trend: getTrend("totalDuration"), dataKey: "total_call_duration_secs", format: (v: number) => `${Math.floor(v / 60)}m ${Math.round(v % 60)}s` },
  ];

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    return hour < 12 ? "Good Morning" : hour < 18 ? "Good Afternoon" : "Good Evening";
  }, []);

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-8">
      <div className="flex flex-col items-center lg:items-start gap-6 lg:flex-row lg:justify-between">
        <div className="space-y-1">
          <div className="flex items-center justify-center lg:justify-start gap-2">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.2em]" style={{ color: UI.colors.text.secondary }}>{greeting}</p>
            <span className="h-px w-8 bg-slate-200"></span>
          </div>
          <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-tight" style={{ color: UI.colors.text.primary }}>
            Dashboard <span className="bg-gradient-to-r from-indigo-600 to-blue-500 bg-clip-text text-transparent">Overview</span>
          </h1>
          <div className="flex items-center justify-center lg:justify-start gap-3 text-sm font-medium">
            <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold text-emerald-600 ring-1 ring-emerald-500/20 shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
              </span>
              System Live
            </span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-2 rounded-[22px] bg-white p-2 shadow-sm ring-1 ring-slate-200/60 backdrop-blur-md">
          <div className="flex items-center p-1 bg-slate-50 rounded-xl">
            {(["7d", "15d", "30d", "all"] as Preset[]).map((p) => (
              <button
                key={p}
                onClick={() => handlePresetChange(p)}
                className={`rounded-lg px-4 py-1.5 text-[11px] font-bold tracking-tight transition-all duration-300 ${preset === p ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200" : "text-slate-400 hover:text-slate-600"}`}
              >
                {p === "30d" ? "1M" : p === "all" ? "ALL" : p.toUpperCase()}
              </button>
            ))}
          </div>
          <div className="hidden sm:block h-6 w-px bg-slate-200 mx-2"></div>
          <div className="flex items-center justify-center gap-3 px-2 py-1 sm:py-0">
            <div className="flex items-center gap-2 group">
              <Calendar size={14} className="text-slate-400 group-hover:text-blue-500 transition-colors" />
              <input type="date" value={from} onChange={(e) => { setPreset("custom"); setRange({ from: e.target.value, to }); }} className="bg-transparent text-[11px] font-bold text-slate-600 outline-none w-28 cursor-pointer hover:text-slate-900" />
            </div>
            <span className="text-slate-300 font-bold">→</span>
            <div className="flex items-center gap-2 group">
              <input type="date" value={to} onChange={(e) => { setPreset("custom"); setRange({ from, to: e.target.value }); }} className="bg-transparent text-[11px] font-bold text-slate-600 outline-none w-28 cursor-pointer hover:text-slate-900" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => (
          <motion.div key={stat.label} variants={item} className="group relative overflow-hidden rounded-[32px] bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.02)] ring-1 ring-slate-200/60 transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_20px_50px_rgba(0,0,0,0.1)] hover:ring-slate-300 cursor-pointer">
            <div className="flex items-start justify-between mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-900 ring-1 ring-slate-200 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3 shadow-sm">
                <stat.icon className="h-6 w-6" />
              </div>
              <div className={`flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-black tracking-tighter ${stat.trend.up ? "bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100" : "bg-red-50 text-red-600 ring-1 ring-red-100"}`}>
                {stat.trend.up ? "↑" : "↓"} {stat.trend.text}
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-bold tracking-[0.1em] text-slate-400 uppercase">{stat.label}</p>
              <div className="flex items-end justify-between gap-3">
                <h2 className="text-2xl font-black tracking-tight text-slate-900 group-hover:text-blue-600 transition-colors">{stat.value}</h2>
                <div className="pb-1.5 opacity-40 group-hover:opacity-100 transition-opacity duration-500 overflow-hidden">
                  <MiniSparkline
                    data={filteredData.map(p => ({
                      value: stat.label.includes("AVG COST") ? (p.conversations > 0 ? (p.cost_usd / p.conversations) : 0) : (p as any)[stat.dataKey]
                    }))}
                    color={stat.trend.up ? "#10b981" : "#ef4444"}
                    formatter={stat.format}
                  />
                </div>
              </div>
            </div>
            <div className="absolute bottom-0 left-0 h-1 w-0 bg-gradient-to-r from-blue-600 to-indigo-600 transition-all duration-700 group-hover:w-full" />
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ConversationsVolumeChart data={filteredData} />
        <ConversationsPerDayChart data={filteredData} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <LeadsCapturedChart data={filteredData} />
        <EngagementChart data={filteredData} />
      </div>

      <AvgCallDurationChart data={filteredData} />
    </motion.div>
  );
}


