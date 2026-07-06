import { useState } from "react";
import {
    X,
    Phone,
    Mail,
} from "lucide-react";
import type { Ticket } from "@/types/ticket.types";
import ticketsApi from "@/api/tickets";

const TOPBAR_HEIGHT = 64;

/* ================= HELPERS ================= */

function getInitials(name: string) {
    if (!name) return "U";
    return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase();
}

/* ================= COMPONENT ================= */

export function TicketDetailsDrawer({
    ticket,
    isOpen,
    onClose,
    onStatusChange,
}: {
    ticket: Ticket | null;
    isOpen: boolean;
    onClose: () => void;
    onStatusChange: (ticketId: string, newStatus: string) => void;
}) {
    const [tab, setTab] = useState<"details" | "notes">("details");
    const [notes, setNotes] = useState("");
    const [updating, setUpdating] = useState(false);

    if (!isOpen || !ticket) return null;

    const handleStatusToggle = async (newStatus: string) => {
        if (ticket.status === newStatus) return;
        try {
            setUpdating(true);
            await ticketsApi.updateTicketStatus(ticket.ticket_id, newStatus);
            onStatusChange(ticket.ticket_id, newStatus);
        } catch (error) {
            console.error("Failed to update status", error);
        } finally {
            setUpdating(false);
        }
    };

    return (
        <div
            className="
        fixed right-0 bottom-0
        bg-white border-l shadow-2xl z-50
        flex flex-col
        w-full sm:w-[420px]
      "
            style={{
                top: `${TOPBAR_HEIGHT}px`,
                height: `calc(100vh - ${TOPBAR_HEIGHT}px)`,
            }}
        >
            {/* ================= STICKY HEADER ================= */}
            <div className="sticky top-0 z-10 bg-white border-b px-5 py-4 flex items-start justify-between">
                <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center text-sm font-semibold">
                        {getInitials(ticket.name)}
                    </div>
                    <div>
                        <p className="font-semibold leading-tight">{ticket.name}</p>
                        <p className="text-xs text-gray-500">{ticket.email}</p>
                    </div>
                </div>

                <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600">
                    <X size={18} />
                </button>
            </div>

            {/* ================= STICKY STATUS ACTION ================= */}
            <div className="sticky top-[73px] z-10 bg-white border-b px-5 py-3 flex items-center justify-between">
                <div>
                    <span className="text-xs text-gray-500 block mb-0.5">Current Status</span>
                    <select
                        value={ticket.status}
                        onChange={(e) => handleStatusToggle(e.target.value)}
                        disabled={updating}
                        className={`text-sm px-3 py-1.5 rounded-lg font-bold uppercase tracking-wider outline-none transition-colors border-none cursor-pointer ${ticket.status?.toLowerCase() === "open"
                            ? "bg-blue-50 text-blue-700 focus:ring-2 focus:ring-blue-600/20"
                            : ticket.status?.toLowerCase() === "in progress"
                                ? "bg-yellow-50 text-yellow-700 focus:ring-2 focus:ring-yellow-600/20"
                                : "bg-green-50 text-green-700 focus:ring-2 focus:ring-green-600/20"
                            } disabled:opacity-50`}
                    >
                        <option value="Open">OPEN</option>
                        <option value="In Progress">IN PROGRESS</option>
                        <option value="Resolved">RESOLVED</option>
                        <option value="Closed">CLOSED</option>
                    </select>
                </div>
            </div>

            {/* ================= STICKY TABS ================= */}
            <div className="sticky top-[140px] z-10 bg-white border-b px-5 flex gap-4 mt-2">
                {[
                    ["details", "Details"],
                    ["notes", "Internal Notes"],
                ].map(([key, label]) => (
                    <button
                        key={key}
                        onClick={() => setTab(key as any)}
                        className={`py-3 text-sm transition-colors ${tab === key
                            ? "border-b-2 border-black font-semibold text-black"
                            : "text-gray-500 hover:text-gray-800"
                            }`}
                    >
                        {label}
                    </button>
                ))}
            </div>

            {/* ================= SCROLLABLE CONTENT ================= */}
            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5 text-sm">
                {tab === "details" && (
                    <>
                        <div className="space-y-4">
                            <InfoRow label="Ticket ID" value={ticket.ticket_id} />
                            <InfoRow label="Category" value={ticket.category} />
                            <InfoRow label="Sub Category" value={ticket.sub_category} />
                            <InfoRow label="Phone" value={ticket.mobile} />
                            <InfoRow label="Email" value={ticket.email} />
                        </div>

                        <div className="pt-4 border-t">
                            <p className="text-gray-500 mb-2 font-medium">Description</p>
                            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                                    {ticket.description}
                                </p>
                            </div>
                        </div>
                    </>
                )}

                {tab === "notes" && (
                    <textarea
                        placeholder="Add internal notes for this ticket..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="w-full h-40 border rounded-xl p-4 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-black/10 transition"
                    />
                )}
            </div>

            {/* ================= STICKY FOOTER ================= */}
            <div className="border-t px-5 py-4 bg-white flex gap-3">
                <button className="flex-1 flex items-center justify-center gap-2 border rounded-xl py-2.5 text-sm font-medium hover:bg-gray-50 transition text-gray-700">
                    <Phone size={16} /> Call User
                </button>
                <button className="flex-1 flex items-center justify-center gap-2 border rounded-xl py-2.5 text-sm font-medium hover:bg-gray-50 transition text-gray-700">
                    <Mail size={16} /> Email User
                </button>
            </div>
        </div>
    );
}

/* ================= SUB COMPONENTS ================= */

function InfoRow({
    label,
    value,
}: {
    label: string;
    value: string;
}) {
    return (
        <div className="flex justify-between items-start gap-4">
            <span className="text-gray-500 shrink-0">{label}</span>
            <span className="font-medium text-right text-gray-900 break-words w-full">{value}</span>
        </div>
    );
}
