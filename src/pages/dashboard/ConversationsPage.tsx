import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import {
  Search,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { UI } from "@/ui/colors";
import { ConversationCard } from "@/components/ConversationCard";
import { ConversationsKpi } from "@/components/ConversationsKpi";
import { DatePickerWithRange } from "@/components/DatePickerWithRange";
import conversationsApi from "@/api/conversations";
import { kpiAPI } from "@/api/kpi";
import type { ConversationsListSummary, KpiSummary } from "@/types/conversation.types";
import { useAuth } from "@/context/AuthContext";

const SOURCE_TABS = [
  { key: "all", label: "All" },
  { key: "web_voice", label: "Website" },
  { key: "phone_call", label: "Phone" },
] as const;

const CATEGORIES = ["Follow Up", "Interested", "General Inquiry", "Not Interested", "Callback Required", "Not Assessable"];

export function ConversationsPage() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [conversations, setConversations] = useState<ConversationsListSummary[]>([]);
  const [nextPage, setNextPage] = useState<string | null>(null);
  const [stack, setStack] = useState<string[]>([]);
    
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 20,
    pages: 1
  });

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [source, setSource] = useState("all");
  const [category, setCategory] = useState("");
  const [kpiSummary, setKpiSummary] = useState<KpiSummary | null>(null);

  const [isLoading, setIsLoading] = useState(true);

  const push = (item: string) => {
    setStack((prev) => [...prev, item]);
  };

  const pop = (): string | undefined => {
    let popped: string | undefined;
    setStack((prev) => {
      if (prev.length === 0) return prev;
      popped = prev[prev.length - 1];
      return prev.slice(0, -1);
    });
    return popped;
  };

  const fetchConversations = useCallback(
    async (cursor: string | null = null, p: number = 1) => {
      if (!user?.agent_id) return;
      try {
        setIsLoading(true);
        // Fetch conversations and KPIs in parallel
        const [convData, kpiData] = await Promise.all([
          conversationsApi.getConversations(
            user?.agent_id,
            cursor,
            p,
            pagination.limit,
            startDate,
            endDate,
            source,
            appliedSearch,
            category
          ),
          p === 1 ? kpiAPI.getKpiSummary(user?.agent_id, startDate, endDate, source) : Promise.resolve(null)
        ]);

        setConversations(convData.conversations);
        setNextPage(convData.nextPage);
        if (convData.pagination) setPagination(convData.pagination as any);
        if (kpiData) setKpiSummary(kpiData);
      } finally {
        setIsLoading(false);
      }
    },
    [user?.agent_id, pagination.limit, startDate, endDate, source, appliedSearch, category]
  );

  useEffect(() => {
    const timer = window.setTimeout(() => setAppliedSearch(searchQuery.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    setPagination(p => ({...p, page: 1}));
    setStack([]);
    fetchConversations(null, 1);
  }, [startDate, endDate, source, category, appliedSearch, fetchConversations]);

  useEffect(() => {
    if (pagination.page !== 1) {
       fetchConversations(null, pagination.page);
    }
  }, [fetchConversations]);

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      {/* HEADER */}
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight leading-tight" style={{ color: UI.colors.text.primary }}>
            Conversations
          </h1>
          <p className="text-base font-medium" style={{ color: UI.colors.text.secondary }}>
            Manage and track your bot interactions
          </p>
        </div>

        {/* FILTERS — full-width row */}
        <div className="grid grid-cols-1 items-end gap-2 md:grid-cols-[auto_auto_minmax(260px,1fr)] md:gap-3">
          {/* SOURCE TABS */}
          <div className="flex h-10 items-center gap-1 bg-white border border-slate-200 rounded-xl p-1 shadow-sm ring-1 ring-slate-100 dark:bg-slate-900 dark:border-slate-800 dark:ring-slate-800">
            {SOURCE_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setSource(tab.key)}
                className={`h-8 px-3.5 rounded-lg text-xs font-bold transition-all ${
                  source === tab.key
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-100"
                    : "text-slate-500 hover:text-slate-900 hover:bg-slate-50 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <DatePickerWithRange
            value={
              startDate && endDate
                ? { from: new Date(startDate), to: new Date(endDate) }
                : undefined
            }
            onChange={(range) => {
              setStartDate(range?.from ? format(range.from, "yyyy-MM-dd") : "");
              setEndDate(range?.to ? format(range.to, "yyyy-MM-dd") : "");
            }}
            label="Date Range"
            className="w-full md:w-auto"
            showClear={Boolean(startDate || endDate)}
          />

          {/* SEARCH — takes remaining space */}
          <div className="relative min-w-0">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              className="w-full h-10 pl-10 pr-4 rounded-xl border border-slate-200 bg-white text-sm font-medium outline-none focus:ring-2 focus:ring-slate-100 shadow-sm transition-all hover:border-slate-300 dark:bg-slate-900 dark:border-slate-800 dark:ring-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1" aria-label="Filter conversations by category">
          <span className="mr-1 shrink-0 text-xs font-semibold text-slate-500 dark:text-slate-400">Category</span>
          {["", ...CATEGORIES].map((value) => (
            <button
              type="button"
              key={value || "all"}
              onClick={() => setCategory(value)}
              aria-pressed={category === value}
              className={`h-8 shrink-0 rounded-full border px-3 text-xs font-semibold transition ${category === value
                ? "border-slate-900 bg-slate-900 text-white shadow-sm dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:border-slate-700 dark:hover:text-slate-100"
              }`}
            >
              {value || "All"}
            </button>
          ))}
        </div>
      </div>

      {/* KPIS */}
      {!isLoading && kpiSummary && (
        <ConversationsKpi 
          totalConversations={kpiSummary.total_conversations}
        />
      )}

      {/* LIST */}
      <div className="flex flex-col gap-3 pr-1 md:pr-2">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-gray-400" />
          </div>
        ) : (
          conversations.map((conversation, index) => (
            <ConversationCard
              key={conversation.conversation_id}
              conversation={conversation}
              index={index + 1 + (pagination.page - 1) * pagination.limit}
            />
          ))
        )}
        {!isLoading && conversations.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-200 py-16 text-center text-sm text-slate-500 dark:border-slate-800">
            No conversations match these filters.
          </div>
        )}
      </div>

      {/* PAGINATION */}
      {!isLoading && pagination.pages > 1 && (
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 px-4 py-4 md:py-6 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden mt-4 dark:bg-slate-900 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <p className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-widest">Page <span className="text-indigo-600">{pagination.page}</span> of <span className="text-indigo-600">{pagination.pages}</span></p>
              <div className="h-4 w-px bg-slate-200 mx-2"></div>
              <p className="text-[10px] sm:text-xs font-bold text-slate-400">Total <span className="text-slate-900 font-black dark:text-slate-100">{pagination.total}</span> conversations</p>
            </div>
            <div className="flex items-center gap-2">
              <button disabled={pagination.page <= 1} onClick={() => { setPagination(p => ({...p, page: Math.max(1, p.page - 1)})); fetchConversations(pop() ?? null, pagination.page - 1); }} className="flex items-center justify-center px-4 h-9 bg-indigo-600 text-white rounded-xl text-[10px] sm:text-xs font-black uppercase transition-all hover:bg-indigo-700 shadow-lg shadow-indigo-100 disabled:opacity-40">Prev</button>
              <div className="flex items-center gap-1">
                {[...Array(pagination.pages)].map((_, i) => {
                  const pNum = i + 1;
                  if (pNum === 1 || pNum === pagination.pages || (pNum >= pagination.page - 1 && pNum <= pagination.page + 1)) {
                    return <button key={pNum} onClick={() => { setPagination(p => ({...p, page: pNum})); fetchConversations(null, pNum); }} className={`w-9 h-9 flex items-center justify-center rounded-xl text-[10px] sm:text-xs font-black transition-all ${pagination.page === pNum ? "bg-indigo-600 text-white shadow-md shadow-indigo-100" : "bg-white border border-slate-200 text-slate-400 hover:text-slate-900 dark:bg-slate-900 dark:border-slate-800 dark:hover:text-slate-100"}`}>{pNum}</button>;
                  }
                  if (pNum === 2 || pNum === pagination.pages - 1) return <span key={pNum} className="text-slate-300 font-bold px-1">.</span>;
                  return null;
                })}
              </div>
              <button disabled={pagination.page >= pagination.pages && !nextPage} onClick={() => { if(nextPage) push(nextPage); setPagination(p => ({...p, page: Math.min(pagination.pages, p.page + 1)})); fetchConversations(nextPage, pagination.page + 1); }} className="flex items-center justify-center px-4 h-9 bg-indigo-600 text-white rounded-xl text-[10px] sm:text-xs font-black uppercase transition-all hover:bg-indigo-700 shadow-lg shadow-indigo-100 disabled:opacity-40">Next</button>
            </div>
          </div>
        )}
      {!isLoading && pagination.pages <= 1 && (nextPage || stack.length > 0) && (
        <div className="flex justify-between md:justify-end gap-2">
          <button
            onClick={() => { setPagination(p => ({...p, page: Math.max(1, p.page - 1)})); fetchConversations(pop() ?? null, pagination.page - 1); }}
            disabled={stack.length === 0 || isLoading}
            className="flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs md:px-4 md:py-2 md:text-sm disabled:opacity-50"
          >
            <ChevronLeft size={14} /> Previous
          </button>
          <button
            onClick={() => { if(nextPage) push(nextPage); setPagination(p => ({...p, page: Math.min(pagination.pages, p.page + 1)})); fetchConversations(nextPage, pagination.page + 1); }}
            disabled={!nextPage || isLoading}
            className="flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs md:px-4 md:py-2 md:text-sm disabled:opacity-50"
          >
             Next <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
