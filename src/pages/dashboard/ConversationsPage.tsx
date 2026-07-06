import { useMemo, useState, useEffect, useCallback } from "react";
import {
  Search,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { UI } from "@/ui/colors";
import { ConversationCard } from "@/components/ConversationCard";
import { ConversationsKpi } from "@/components/ConversationsKpi";
import conversationsApi from "@/api/conversations";
import { kpiAPI } from "@/api/kpi";
import type { ConversationsListSummary, KpiSummary } from "@/types/conversation.types";
import { useAuth } from "@/context/AuthContext";

export function ConversationsPage() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [conversations, setConversations] = useState<ConversationsListSummary[]>([]);
  const [nextPage, setNextPage] = useState<string | null>(null);
  const [stack, setStack] = useState<string[]>([]);
    
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 30,
    pages: 1
  });

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
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
            endDate
          ),
          p === 1 ? kpiAPI.getKpiSummary(user?.agent_id, startDate, endDate) : Promise.resolve(null)
        ]);

        setConversations(convData.conversations);
        setNextPage(convData.nextPage);
        if (convData.pagination) setPagination(convData.pagination as any);
        if (kpiData) setKpiSummary(kpiData);
      } finally {
        setIsLoading(false);
      }
    },
    [user?.agent_id, pagination.limit, startDate, endDate]
  );

  useEffect(() => {
    setPagination(p => ({...p, page: 1}));
    setStack([]);
    fetchConversations(null, 1);
  }, [startDate, endDate, searchQuery, fetchConversations]);

  useEffect(() => {
    if (pagination.page !== 1) {
       fetchConversations(null, pagination.page);
    }
  }, [fetchConversations]);

  const filteredConversations = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return conversations.filter(
      (c) =>
        (c.title ?? "").toLowerCase().includes(q) ||
        (c.conversation_id ?? "").toLowerCase().includes(q)
    );
  }, [searchQuery, conversations]);

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      {/* HEADER */}
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight leading-tight" style={{ color: UI.colors.text.primary }}>
            Conversations
          </h1>
          <p className="text-base font-medium" style={{ color: UI.colors.text.secondary }}>
            Manage and track your bot interactions
          </p>
        </div>

        {/* FILTERS */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center bg-white border border-slate-200 rounded-xl h-10 shadow-sm overflow-hidden ring-1 ring-slate-100">
            <div className="flex flex-col px-3 border-r border-slate-100 group">
              <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest leading-none mt-1.5 group-hover:text-blue-500 transition-colors">From</span>
              <input 
                type="date" 
                value={startDate} 
                onChange={(e) => setStartDate(e.target.value)} 
                className="text-xs outline-none bg-transparent font-semibold py-0.5 cursor-pointer" 
              />
            </div>
            <div className="flex flex-col px-3 group">
              <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest leading-none mt-1.5 group-hover:text-blue-500 transition-colors">To</span>
              <input 
                type="date" 
                value={endDate} 
                onChange={(e) => setEndDate(e.target.value)} 
                className="text-xs outline-none bg-transparent font-semibold py-0.5 cursor-pointer" 
              />
            </div>
          </div>

          {(startDate || endDate) && (
            <button 
              onClick={() => { setStartDate(""); setEndDate(""); }} 
              className="text-sm text-red-500 font-bold hover:text-red-600 transition-colors px-1"
            >
              Clear
            </button>
          )}

          {/* SEARCH */}
          <div className="relative w-full md:w-[320px]">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              className="w-full h-11 pl-10 pr-4 rounded-xl border border-slate-200 bg-white text-sm font-medium outline-none focus:ring-2 focus:ring-slate-100 shadow-sm transition-all hover:border-slate-300"
            />
          </div>
        </div>
      </div>

      {/* KPIS */}
      {!isLoading && kpiSummary && (
        <ConversationsKpi 
          totalConversations={kpiSummary.total_conversations}
          totalMessages={kpiSummary.total_messages}
        />
      )}

      {/* PAGINATION */}
      {!isLoading && pagination.pages > 1 && (
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 px-4 py-4 md:py-6 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden mt-4">
            <div className="flex items-center gap-2">
              <p className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-widest">Page <span className="text-indigo-600">{pagination.page}</span> of <span className="text-indigo-600">{pagination.pages}</span></p>
              <div className="h-4 w-px bg-slate-200 mx-2"></div>
              <p className="text-[10px] sm:text-xs font-bold text-slate-400">Total <span className="text-slate-900 font-black">{pagination.total}</span> conversations</p>
            </div>
            <div className="flex items-center gap-2">
              <button disabled={pagination.page <= 1} onClick={() => { setPagination(p => ({...p, page: Math.max(1, p.page - 1)})); fetchConversations(pop() ?? null, pagination.page - 1); }} className="flex items-center justify-center px-4 h-9 bg-indigo-600 text-white rounded-xl text-[10px] sm:text-xs font-black uppercase transition-all hover:bg-indigo-700 shadow-lg shadow-indigo-100 disabled:opacity-40">Prev</button>
              <div className="flex items-center gap-1">
                {[...Array(pagination.pages)].map((_, i) => {
                  const pNum = i + 1;
                  if (pNum === 1 || pNum === pagination.pages || (pNum >= pagination.page - 1 && pNum <= pagination.page + 1)) {
                    return <button key={pNum} onClick={() => { setPagination(p => ({...p, page: pNum})); fetchConversations(null, pNum); }} className={`w-9 h-9 flex items-center justify-center rounded-xl text-[10px] sm:text-xs font-black transition-all ${pagination.page === pNum ? "bg-indigo-600 text-white shadow-md shadow-indigo-100" : "bg-white border border-slate-200 text-slate-400 hover:text-slate-900"}`}>{pNum}</button>;
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

      {/* LIST */}
      <div className="flex flex-col gap-3 pr-1 md:pr-2">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-gray-400" />
          </div>
        ) : (
          filteredConversations.map((conversation, index) => (
            <ConversationCard
              key={conversation.conversation_id}
              conversation={conversation}
              index={index + 1 + (pagination.page - 1) * pagination.limit}
            />
          ))
        )}
      </div>
    </div>
  );
}
