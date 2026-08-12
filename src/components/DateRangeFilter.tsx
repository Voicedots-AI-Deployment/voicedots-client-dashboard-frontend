import { Calendar } from "lucide-react";

interface Props {
  startDate: string;
  endDate: string;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onClear: () => void;
  height?: "h-10" | "h-11";
}

export function DateRangeFilter({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onClear,
  height = "h-11",
}: Props) {
  return (
    <>
      <div
        className={`flex items-center bg-white border border-slate-200 rounded-xl ${height} shadow-sm overflow-hidden ring-1 ring-slate-100 dark:bg-slate-900 dark:border-slate-800 dark:ring-slate-800`}
      >
        <div className="flex items-center pl-3 pr-1 h-full text-slate-400">
          <Calendar size={14} />
        </div>
        <div className="flex flex-col px-2 border-r border-slate-100 group h-full justify-center dark:border-slate-800">
          <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest leading-none mb-1 group-hover:text-blue-500 transition-colors">
            From
          </span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => onStartDateChange(e.target.value)}
            className="text-xs outline-none bg-transparent font-semibold py-0.5 cursor-pointer text-slate-700 dark:text-slate-200 dark:[color-scheme:dark]"
          />
        </div>
        <div className="flex flex-col px-2 group h-full justify-center">
          <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest leading-none mb-1 group-hover:text-blue-500 transition-colors">
            To
          </span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => onEndDateChange(e.target.value)}
            className="text-xs outline-none bg-transparent font-semibold py-0.5 cursor-pointer text-slate-700 dark:text-slate-200 dark:[color-scheme:dark]"
          />
        </div>
      </div>

      {(startDate || endDate) && (
        <button
          onClick={onClear}
          className="text-sm text-red-500 font-bold hover:text-red-600 transition-colors px-1"
        >
          Clear
        </button>
      )}
    </>
  );
}
