import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Phone,
  Search,
  Loader2,
  Download,
  Trash2,
} from "lucide-react";
import leadsApi from "@/api/leads";
import { LeadDetailsDrawer } from "@/components/LeadDetailsDrawer";
import { LeadsKpi } from "@/components/leadsKpi";
import type { Lead } from "@/types/lead.types";
import { useAuth } from "@/context/AuthContext";
import { UI } from "@/ui/colors";

const DRAWER_WIDTH = 420;

export function LeadsPage() {
  const { user } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    total: 0,
    qualified: 0,
    page: 1,
    limit: 50,
    pages: 0
  });

  const fetchLeads = useCallback(async (isExport = false) => {
    if (!user?.agent_id && !isExport) return;
    if (!isExport) setLoading(true);
    try {
      const response = await leadsApi.getLeads({
        agentId: user?.agent_id,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        status: statusFilter || undefined,
        page: isExport ? 1 : page,
        limit: isExport ? 10000 : 50,
      });
      if (isExport) return response.data;
      setLeads(response.data);
      setPagination(response.pagination);
    } catch (err) {
      console.error("Failed to fetch leads:", err);
    } finally {
      if (!isExport) setLoading(false);
    }
  }, [user?.agent_id, startDate, endDate, statusFilter, page]);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  useEffect(() => { setPage(1); }, [startDate, endDate, statusFilter, search]);

  const handleDeleteLead = async (e: React.MouseEvent, conversationId: string) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this lead?")) return;
    try {
      await leadsApi.deleteLead(conversationId, user?.agent_id);
      setLeads(prev => prev.filter(l => l.conversation_id !== conversationId));
      if (selectedLead?.conversation_id === conversationId) {
        setDrawerOpen(false);
        setSelectedLead(null);
      }
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  const filteredLeads = useMemo(() => 
    leads.filter(l => 
      (l.name ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (l.email ?? "").toLowerCase().includes(search.toLowerCase())
    ), [leads, search]);

  const generateDownload = (leadsToExport: Lead[], filename: string) => {
    if (!leadsToExport.length) return;
    const escapeCsv = (str: any) => `"${String(str || "").replace(/"/g, '""')}"`;
    const formatDt = (iso: any) => {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return '""';
      const p = (n: number) => String(n).padStart(2, "0");
      return `"${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}, ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}"`;
    };

    const headers = ["Name", "Phone", "Email", "Description", "Status", "Date"].join(",");
    const rows = leadsToExport.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
      .map(l => [escapeCsv(l.name), escapeCsv(l.mobile || l.phone), escapeCsv(l.email), escapeCsv(l.business_description || l.summary), escapeCsv(l.status), formatDt(l.created_at)].join(","));

    const blob = new Blob(["\uFEFF" + [headers, ...rows].join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
      <div className="flex flex-col gap-6 transition-all duration-300" style={{ marginRight: (drawerOpen && window.innerWidth > 1024) ? `${DRAWER_WIDTH}px` : "0px" }}>
        <div className="flex flex-col items-center md:items-end md:flex-row md:justify-between gap-4 mb-4">
          <div className="text-center md:text-left">
            <h1 className="text-3xl font-bold tracking-tight leading-tight" style={{ color: UI.colors.text.primary }}>
              Leads
            </h1>
            <p className="text-base font-medium" style={{ color: UI.colors.text.secondary }}>
              Captured automatically by your AI avatar
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center md:justify-end gap-3 px-2">
            <div className="flex items-center bg-white border border-slate-200 rounded-xl h-11 shadow-sm overflow-hidden ring-1 ring-slate-100">
              <div className="flex flex-col px-3 border-r border-slate-100 group">
                <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest leading-none mt-1.5 group-hover:text-blue-500 transition-colors">From</span>
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="text-xs outline-none bg-transparent font-semibold py-0.5 cursor-pointer" />
              </div>
              <div className="flex flex-col px-3 group">
                <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest leading-none mt-1.5 group-hover:text-blue-500 transition-colors">To</span>
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="text-xs outline-none bg-transparent font-semibold py-0.5 cursor-pointer" />
              </div>
            </div>

            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={`h-11 px-4 rounded-xl border text-sm outline-none font-bold shadow-sm min-w-[130px] transition-all hover:border-slate-300 ${statusFilter === "Qualified" ? "bg-green-50 text-green-700 border-green-200" : statusFilter === "Unqualified" ? "bg-red-50 text-red-700 border-red-200" : statusFilter === "Follow Up" ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-white text-slate-700 border-slate-200"}`}>
              <option value="">All Status</option>
              <option value="Qualified">Qualified</option>
              <option value="Unqualified">Unqualified</option>
              <option value="Follow Up">Follow Up</option>
            </select>

            <div className="relative min-w-[200px] flex-1 md:flex-none">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input placeholder="Search leads..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full h-11 pl-10 pr-4 rounded-xl border border-slate-200 bg-white text-sm font-medium outline-none focus:ring-2 focus:ring-slate-100 shadow-sm transition-all hover:border-slate-300" />
            </div>

            {(startDate || endDate || statusFilter) && (
              <button onClick={() => { setStartDate(""); setEndDate(""); setStatusFilter(""); }} className="text-sm text-red-500 font-bold hover:text-red-600 transition-colors px-1">Clear</button>
            )}

            <div className="relative">
              <button 
                onClick={() => setExportMenuOpen(!exportMenuOpen)} 
                disabled={leads.length === 0} 
                className="flex items-center justify-center gap-2.5 h-11 px-5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all disabled:opacity-50 shadow-lg shadow-indigo-100 active:scale-95"
              >
                <Download size={18} />
                <span>Export</span>
              </button>
              {exportMenuOpen && (
                <div className="absolute top-full right-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-1">
                  <button onClick={() => { generateDownload(leads, "leads_current.csv"); setExportMenuOpen(false); }} className="w-full text-left px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 rounded-lg transition-colors border-b border-slate-50">Current Page</button>
                  <button onClick={async () => { const all = await fetchLeads(true); if (all) generateDownload(all as Lead[], "leads_all.csv"); setExportMenuOpen(false); }} className="w-full text-left px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 rounded-lg transition-colors">All Leads</button>
                </div>
              )}
            </div>
          </div>
        </div>

        {!loading && <LeadsKpi totalLeads={pagination.total} qualifiedLeads={pagination.qualified} />}

        {!loading && pagination.pages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-4 sm:py-6 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="flex items-center gap-2">
              <p className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-widest">Page <span className="text-indigo-600">{pagination.page}</span> of <span className="text-indigo-600">{pagination.pages}</span></p>
              <div className="h-4 w-px bg-slate-200 mx-2"></div>
              <p className="text-[10px] sm:text-xs font-bold text-slate-400">Total <span className="text-slate-900 font-black">{pagination.total}</span> leads</p>
            </div>
            <div className="flex items-center gap-2">
              <button 
                disabled={page <= 1} 
                onClick={() => setPage(p => Math.max(1, p - 1))} 
                className="flex items-center justify-center px-4 h-9 bg-indigo-600 text-white rounded-xl text-[10px] sm:text-xs font-black uppercase transition-all hover:bg-indigo-700 shadow-lg shadow-indigo-100 disabled:opacity-40"
              >
                Prev
              </button>
              <div className="flex items-center gap-1">
                {[...Array(pagination.pages)].map((_, i) => {
                  const pNum = i + 1;
                  if (pNum === 1 || pNum === pagination.pages || (pNum >= page - 1 && pNum <= page + 1)) {
                    return <button key={pNum} onClick={() => setPage(pNum)} className={`w-9 h-9 flex items-center justify-center rounded-xl text-[10px] sm:text-xs font-black transition-all ${page === pNum ? "bg-indigo-600 text-white shadow-md shadow-indigo-100" : "bg-white border border-slate-200 text-slate-400 hover:text-slate-900"}`}>{pNum}</button>;
                  }
                  if (pNum === 2 || pNum === pagination.pages - 1) return <span key={pNum} className="text-slate-300 font-bold px-1">.</span>;
                  return null;
                })}
              </div>
              <button 
                disabled={page >= pagination.pages} 
                onClick={() => setPage(p => Math.min(pagination.pages, p + 1))} 
                className="flex items-center justify-center px-4 h-9 bg-indigo-600 text-white rounded-xl text-[10px] sm:text-xs font-black uppercase transition-all hover:bg-indigo-700 shadow-lg shadow-indigo-100 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}

        <div className="space-y-3 pr-1">
          {loading ? (
            <div className="flex justify-center items-center py-24">
              <Loader2 className="animate-spin text-indigo-400" size={32} />
            </div>
          ) : filteredLeads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 bg-white border border-dashed border-slate-200 rounded-3xl gap-4">
              <div className="p-4 rounded-full bg-slate-50 text-slate-300">
                <Search size={32} />
              </div>
              <p className="text-slate-500 font-bold">No leads found</p>
            </div>
          ) : (
            filteredLeads.map((lead) => (
              <div
                key={lead.conversation_id}
                onClick={() => { setSelectedLead(lead); setDrawerOpen(true); }}
                className="group flex items-center bg-white border border-slate-100 rounded-2xl px-5 py-4 cursor-pointer transition-all duration-300 hover:shadow-xl hover:shadow-indigo-500/5 hover:border-indigo-100/50 hover:-translate-y-0.5 gap-6"
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 flex items-center justify-center text-sm font-black shrink-0 text-slate-600 shadow-sm group-hover:from-indigo-50 group-hover:to-white group-hover:border-indigo-200 transition-colors">
                    {(lead.name ?? "?").split(" ").map(n => n[0]).join("").toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold truncate text-slate-900 text-base mb-0.5 group-hover:text-indigo-600 transition-colors">
                      {lead.name ?? "Unknown"}
                    </p>
                    <p className="text-[13px] font-medium text-slate-400 truncate">
                      {lead.email ?? "—"}
                    </p>
                  </div>
                </div>

                <div className="hidden lg:flex items-center gap-10 text-sm text-slate-600 w-[350px] shrink-0">
                  <div className="flex items-center gap-2.5 w-[140px] shrink-0">
                    <div className="p-1.5 rounded-lg bg-slate-50 text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-500 transition-colors">
                      <Phone size={14} />
                    </div>
                    <span className="truncate font-bold text-slate-700">{lead.mobile || lead.phone || "—"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-400 font-bold tracking-tight whitespace-nowrap">
                    {lead.created_at ? new Date(lead.created_at).toLocaleString(undefined, {
                      dateStyle: 'medium',
                      timeStyle: 'short'
                    }) : "—"}
                  </div>
                </div>

                <div className="w-[130px] flex justify-center shrink-0">
                  <span className={`text-[10px] uppercase tracking-widest px-4 py-1.5 rounded-xl font-black shadow-sm ${
                    lead.status === "Qualified" 
                      ? "bg-emerald-50 text-emerald-600 border border-emerald-100" 
                      : lead.status === "Unqualified" 
                      ? "bg-amber-50 text-amber-600 border border-amber-100" 
                      : "bg-indigo-50 text-indigo-600 border border-indigo-100"
                  }`}>
                    {lead.status}
                  </span>
                </div>

                <div className="w-10 flex justify-end shrink-0">
                  <button 
                    onClick={(e) => handleDeleteLead(e, lead.conversation_id)} 
                    className="w-10 h-10 rounded-xl border border-slate-100 flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 hover:border-red-100 transition-all opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <LeadDetailsDrawer
        lead={selectedLead}
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onUpdateLead={(updated) => { setLeads(prev => prev.map(l => l.conversation_id === updated.conversation_id ? updated : l)); setSelectedLead(updated); }}
        onDeleteLead={(id) => { setLeads(prev => prev.filter(l => l.conversation_id !== id)); setDrawerOpen(false); setSelectedLead(null); }}
      />
    </>
  );
}

