import { Calendar } from "lucide-react";

type Preset = "7d" | "15d" | "30d" | "custom";

interface Props {
  preset: Preset;
  from?: string;
  to?: string;
  onPresetChange: (p: Preset) => void;
  onDateChange: (from: string, to: string) => void;
}

export function DateRangeFilter({
  preset,
  from,
  to,
  onPresetChange,
  onDateChange,
}: Props) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Presets */}
      <div className="flex rounded-lg border border-slate-200 overflow-hidden">
        {[
          { key: "7d", label: "7D" },
          { key: "15d", label: "15D" },
          { key: "30d", label: "1M" },
        ].map((p) => (
          <button
            key={p.key}
            onClick={() => onPresetChange(p.key as Preset)}
            className={`px-3 py-1.5 text-sm font-medium ${
              preset === p.key
                ? "bg-indigo-600 text-white"
                : "bg-white text-slate-600 hover:bg-slate-100"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Custom Range */}
      <div className="flex items-center gap-2 text-sm text-slate-600">
        <Calendar size={16} />
        <input
          type="date"
          value={from}
          onChange={(e) =>
            onDateChange(e.target.value, to || e.target.value)
          }
          className="rounded-md border border-slate-200 px-2 py-1"
        />
        <span>–</span>
        <input
          type="date"
          value={to}
          onChange={(e) =>
            onDateChange(from || e.target.value, e.target.value)
          }
          className="rounded-md border border-slate-200 px-2 py-1"
        />
      </div>
    </div>
  );
}
