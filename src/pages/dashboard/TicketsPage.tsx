import { useEffect, useState } from "react";
import {
    Search,
    Loader2,
    Ticket as TicketIcon,
    Phone,
    Info,
} from "lucide-react";
import ticketsApi from "@/api/tickets";
import { TicketDetailsDrawer } from "@/components/TicketDetailsDrawer";
import type { Ticket } from "@/types/ticket.types";

const DRAWER_WIDTH = 420;

export function TicketsPage() {
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);

    const [selectedTicket, setSelectedTicket] =
        useState<Ticket | null>(null);
    const [drawerOpen, setDrawerOpen] =
        useState(false);

    /* ================= FETCH TICKETS ================= */

    useEffect(() => {
        async function fetchTickets() {
            setLoading(true);
            try {
                const data = await ticketsApi.getTickets();
                setTickets(data);
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        }

        fetchTickets();
    }, []);

    /* ================= HANDLERS ================= */

    const handleStatusChange = (ticketId: string, newStatus: string) => {
        // Update local list
        setTickets((prev) =>
            prev.map((t) =>
                t.ticket_id === ticketId ? { ...t, status: newStatus as any } : t
            )
        );
        // Update selected ticket in drawer
        if (selectedTicket?.ticket_id === ticketId) {
            setSelectedTicket((prev) =>
                prev ? { ...prev, status: newStatus as any } : null
            );
        }
    };

    /* ================= DERIVED DATA ================= */

    const filteredTickets = tickets.filter(
        (t) =>
            t.name.toLowerCase().includes(search.toLowerCase()) ||
            t.email.toLowerCase().includes(search.toLowerCase()) ||
            t.category.toLowerCase().includes(search.toLowerCase()) ||
            t.sub_category.toLowerCase().includes(search.toLowerCase())
    );

    const totalTickets = tickets.length;
    const openTickets = tickets.filter(
        (t) => t.status?.toLowerCase() === "open" || t.status?.toLowerCase() === "in progress"
    ).length;
    const closedTickets = tickets.filter(
        (t) => t.status?.toLowerCase() === "closed" || t.status?.toLowerCase() === "resolved"
    ).length;

    /* ================= RENDER ================= */

    return (
        <>
            {/* ================= MAIN CONTENT ================= */}
            <div
                className="flex flex-col gap-6 transition-all duration-300"
                style={{
                    marginRight: (drawerOpen && window.innerWidth > 1024)
                        ? `${DRAWER_WIDTH}px`
                        : "0px",
                }}
            >
                {/* ================= HEADER ================= */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 shrink-0">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-white">
                            Support Tickets
                        </h1>
                        <p className="text-sm text-slate-500 mt-1">
                            Manage user inquiries and reported issues
                        </p>
                    </div>

                    {/* SEARCH */}
                    <div className="relative w-full md:w-[280px]">
                        <Search
                            size={16}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                        />
                        <input
                            placeholder="Search tickets..."
                            value={search}
                            onChange={(e) =>
                                setSearch(e.target.value)
                            }
                            className="w-full h-11 pl-9 pr-3 rounded-xl border border-white/5 bg-[#161722] text-sm outline-none focus:ring-2 focus:ring-black/5 transition-shadow"
                        />
                    </div>
                </div>

                {/* Ticketing has no producer yet and its API router is still
                    disabled, so the list stays empty — say so rather than
                    leaving an unexplained blank page. */}
                <div className="flex items-start gap-2 rounded-xl border border-indigo-200 bg-[#7B3FE4]/15 px-4 py-3 text-sm text-indigo-800 shrink-0">
                    <Info size={16} className="mt-0.5 shrink-0" />
                    <span>
                        Support ticketing is being enabled for your account. Tickets raised by the
                        assistant will show up here once it's active.
                    </span>
                </div>

                {/* ================= KPI SECTION ================= */}
                {!loading && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 shrink-0">
                        <div className="bg-[#161722] border border-white/5 rounded-2xl p-4 sm:p-5 hover:border-white/10 transition-colors">
                            <p className="text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-1">Total</p>
                            <p className="text-2xl sm:text-3xl font-bold text-white">{totalTickets}</p>
                        </div>
                        <div className="bg-[#161722] border border-white/5 rounded-2xl p-4 sm:p-5 hover:border-blue-200 transition-colors">
                            <p className="text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-1">Open</p>
                            <p className="text-2xl sm:text-3xl font-bold text-blue-600">{openTickets}</p>
                        </div>
                        <div className="bg-[#161722] border border-white/5 rounded-2xl p-4 sm:p-5 hover:border-green-200 transition-colors">
                            <p className="text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-1">Closed</p>
                            <p className="text-2xl sm:text-3xl font-bold text-green-600">{closedTickets}</p>
                        </div>
                    </div>
                )}

                {/* ================= TICKETS LIST ================= */}
                <div className="space-y-2 pr-1 pb-4">
                    {loading ? (
                        <div className="flex justify-center py-20">
                            <Loader2 className="animate-spin text-slate-500 w-8 h-8" />
                        </div>
                    ) : filteredTickets.length === 0 ? (
                        <div className="text-center py-20 text-slate-500 text-sm bg-[#0B0B13] rounded-2xl border border-dashed border-white/5">
                            <TicketIcon className="mx-auto h-10 w-10 text-slate-600 mb-3" />
                            <p>No tickets found</p>
                        </div>
                    ) : (
                        filteredTickets.map((ticket) => (
                            <div
                                key={ticket.ticket_id}
                                onClick={() => {
                                    setSelectedTicket(ticket);
                                    setDrawerOpen(true);
                                }}
                                className="flex items-center justify-between bg-[#161722] border border-white/5 rounded-xl px-3 py-2.5 sm:px-4 sm:py-3 cursor-pointer transition-all duration-200 hover:bg-[#0B0B13] hover:border-white/10 group gap-3"
                            >
                                {/* LEFT: User Info */}
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center text-xs sm:text-sm font-bold shrink-0">
                                        {ticket.name
                                            ? ticket.name
                                                .split(" ")
                                                .map((n) => n[0])
                                                .join("")
                                                .toUpperCase()
                                                .substring(0, 2)
                                            : "U"}
                                    </div>

                                    <div className="min-w-0">
                                        <p className="font-semibold text-white truncate text-sm sm:text-base">
                                            {ticket.name}
                                        </p>
                                        <p className="text-[10px] sm:text-xs text-slate-500 truncate mt-0.5">
                                            {ticket.email}
                                        </p>
                                    </div>
                                </div>

                                {/* MIDDLE: Category (Desktop) */}
                                <div className="hidden md:flex flex-col min-w-0 w-1/4">
                                    <p className="text-sm font-medium text-slate-600 truncate">{ticket.category}</p>
                                    <p className="text-[10px] text-slate-500 truncate mt-0.5 capitalize">{ticket.sub_category}</p>
                                </div>

                                {/* PHONE (Large Screens) */}
                                <div className="hidden lg:flex items-center gap-2 text-sm text-slate-500 w-32 shrink-0">
                                    <Phone size={14} className="text-slate-500" />
                                    <span className="truncate">{ticket.mobile}</span>
                                </div>

                                {/* STATUS & ACTION */}
                                <div className="flex items-center justify-end gap-2 sm:gap-4 shrink-0">
                                    <span
                                        className={`text-[9px] sm:text-[10px] px-2 py-0.5 sm:px-3 sm:py-1 rounded-full font-bold uppercase tracking-wider shrink-0 ${ticket.status?.toLowerCase() === "open" ? "bg-blue-50 text-blue-700 ring-1 ring-blue-600/20" : ticket.status?.toLowerCase() === "in progress" ? "bg-yellow-50 text-yellow-700 ring-1 ring-yellow-600/20" : "bg-green-50 text-green-700 ring-1 ring-green-600/20" }`}
                                    >
                                        {ticket.status}
                                    </span>

                                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-slate-500 group-hover:text-black group-hover:bg-white/[0.04] transition-colors shrink-0 hidden sm:flex">
                                        <TicketIcon size={16} />
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* ================= DRAWER ================= */}
            <TicketDetailsDrawer
                ticket={selectedTicket}
                isOpen={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                onStatusChange={handleStatusChange}
            />
        </>
    );
}
