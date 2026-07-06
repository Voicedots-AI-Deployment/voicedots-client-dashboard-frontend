import { useState } from "react";
import {
  X,
  Phone,
  Mail,
  MessageCircle,
  Loader2,
  Trash2,
} from "lucide-react";
import type { Lead, LeadStatus } from "@/types/lead.types";
import leadsApi from "@/api/leads";
import { useAuth } from "@/context/AuthContext";

const TOPBAR_HEIGHT = 64;

/* ================= HELPERS ================= */

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

/* ================= COMPONENT ================= */

export function LeadDetailsDrawer({
  lead,
  isOpen,
  onClose,
  onUpdateLead,
  onDeleteLead,
}: {
  lead: Lead | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateLead: (lead: Lead) => void;
  onDeleteLead: (conversationId: string) => void;
}) {
  const [tab, setTab] = useState<
    "details" | "notes" | "activity" | "next"
  >("details");
  const { user } = useAuth();

  const [notes, setNotes] = useState("");
  const [updating, setUpdating] = useState(false);

  if (!isOpen || !lead) return null;

  async function handleStatusChange(newStatus: LeadStatus) {
    if (!lead) return;
    setUpdating(true);
    try {
      await leadsApi.updateLeadStatus(lead.conversation_id, newStatus, user?.agent_id);
      onUpdateLead({ ...lead, status: newStatus });
    } catch (error) {
      console.error("Failed to update lead status:", error);
    } finally {
      setUpdating(false);
    }
  }

  async function handleDelete() {
    if (!lead) return;
    if (!window.confirm("Are you sure you want to delete this lead?")) return;
    
    try {
      await leadsApi.deleteLead(lead.conversation_id, user?.agent_id);
      onDeleteLead(lead.conversation_id);
    } catch (error) {
      console.error("Delete failed:", error);
    }
  }

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
          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-sm font-semibold">
            {getInitials(lead.name || "Unknown")}
          </div>
          <div>
            <p className="font-semibold leading-tight">{lead.name}</p>
            <p className="text-xs text-gray-500">{lead.email}</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button 
            onClick={handleDelete}
            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            title="Delete Lead"
          >
            <Trash2 size={18} />
          </button>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={18} />
          </button>
        </div>
      </div>

      {/* ================= STICKY STATUS ================= */}
      <div className="sticky top-[73px] z-10 bg-white border-b px-5 py-3 relative">
        <select
          value={lead.status}
          onChange={(e) => handleStatusChange(e.target.value as LeadStatus)}
          disabled={updating}
          className={`w-full border-2 rounded-lg px-3 py-2 text-sm outline-none transition-all duration-200 ${
            lead.status === "Qualified"
              ? "border-green-100 text-green-700 bg-green-50/10 focus:border-green-500"
              : lead.status === "Unqualified"
              ? "border-yellow-100 text-yellow-700 bg-yellow-50/10 focus:border-yellow-500"
              : "border-blue-100 text-blue-700 bg-blue-50/10 focus:border-blue-500"
          }`}
        >
          <option value="Qualified">Qualified</option>
          <option value="Unqualified">Unqualified</option>
          <option value="Follow Up">Follow Up</option>
        </select>
        {updating && (
          <div className="absolute right-12 top-1/2 -translate-y-1/2">
            <Loader2 size={16} className="animate-spin text-gray-400" />
          </div>
        )}
      </div>

      {/* ================= STICKY ACTIONS ================= */}
      <div className="sticky top-[130px] z-10 bg-white border-b px-5 py-4 mb-10 grid grid-cols-3 gap-3">
        <Action
          icon={<Phone size={16} />}
          label="Call"
          disabled
          title="Feature coming soon"
          tooltipVariant="blue"
        />
        <Action
          icon={<Mail size={16} />}
          label="Email"
          disabled
          title="Feature coming soon"
          tooltipVariant="indigo"
        />
        <Action
          icon={<MessageCircle size={16} />}
          label="WhatsApp"
          disabled={!(lead.mobile || lead.phone)}
          onClick={() => {
            const phoneStr = lead.mobile || lead.phone;
            if (phoneStr) {
               window.open(`https://wa.me/${phoneStr.replace(/\D/g, "")}`, "_blank");
            }
          }}
          tooltipVariant="green"
        />
      </div>

      {/* ================= STICKY TABS ================= */}
      <div className="sticky top-[200px] z-10 bg-white border-b px-5 flex gap-4">
        {[
          ["details", "Details"],
          ["notes", "Notes"],
          ["activity", "Activity"],
          ["next", "Next Call"],
        ].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key as any)}
            className={`py-3 text-sm ${
              tab === key
                ? "border-b-2 border-black font-semibold"
                : "text-gray-500"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ================= SCROLLABLE CONTENT ================= */}
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5 text-sm min-w-0">
  {tab === "details" && (
    <>
      <InfoRow label="Phone" value={lead.mobile || lead.phone || "—"} />
      <InfoRow label="Email" value={lead.email || "—"} />

      <div className="flex justify-between items-start gap-4 min-w-0">
        <p className="text-gray-500 shrink-0">Business Description</p>

        <p className="font-medium leading-relaxed text-right max-w-xl w-full min-w-0 break-words overflow-hidden">
          {lead.business_description || lead.summary || "—"}
        </p>
      </div>
    </>
  )}

  {tab === "notes" && (
    <textarea
      placeholder="Add internal notes..."
      value={notes}
      onChange={(e) => setNotes(e.target.value)}
      className="w-full h-40 border rounded-lg p-3 text-sm resize-none min-w-0"
    />
  )}

  {tab === "activity" && (
    <ul className="space-y-4 text-gray-600 min-w-0 break-words">
      <li className="flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
        <span>AI conversation completed</span>
      </li>
      <li className="flex items-center gap-2">
        <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${
          lead.status === "Qualified"
            ? "bg-green-500"
            : lead.status === "Unqualified"
            ? "bg-yellow-500"
            : "bg-blue-500"
        }`} />
        <span>Lead status: </span>
        <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
          lead.status === "Qualified"
            ? "bg-green-50 text-green-700 border border-green-100"
            : lead.status === "Unqualified"
            ? "bg-yellow-50 text-yellow-700 border border-yellow-100"
            : "bg-blue-50 text-blue-700 border border-blue-100"
        }`}>
          {lead.status}
        </span>
      </li>
    </ul>
  )}

  {tab === "next" && (
    <div className="min-w-0">
      <label className="text-gray-500 block mb-1">
        Schedule next call
      </label>
      <input
        type="datetime-local"
        className="border rounded-lg px-3 py-2 w-full text-sm min-w-0"
      />
    </div>
  )}
</div>

      {/* ================= STICKY FOOTER ================= */}
      <div className="border-t px-5 py-4 bg-white">
        <p className="text-xs text-gray-500 mb-2">Next Suggested Action</p>

        <div className="flex gap-3">
          <Action
            label="Schedule Call"
            disabled
            title="Feature coming soon"
            tooltipVariant="blue"
          />
          <Action
            label="Send WhatsApp"
            disabled={!(lead.mobile || lead.phone)}
            onClick={() => {
              const phoneStr = lead.mobile || lead.phone;
              if (phoneStr) {
                 window.open(`https://wa.me/${phoneStr.replace(/\D/g, "")}`, "_blank");
              }
            }}
            tooltipVariant="green"
          />
        </div>

        <div className="mt-3 text-xs text-gray-500">
          Last AI Call:{" "}
          <span className="text-gray-700">4m 32s · {lead.status}</span>
        </div>
      </div>
    </div>
  );
}

/* ================= SUB COMPONENTS ================= */

type TooltipVariant = "blue" | "indigo" | "green" | "gray";

function Action({
  icon,
  label,
  disabled,
  title,
  onClick,
  tooltipVariant = "gray",
}: {
  icon?: React.ReactNode;
  label: string;
  disabled?: boolean;
  title?: string;
  onClick?: () => void;
  tooltipVariant?: TooltipVariant;
}) {
  const variantStyles = {
    blue: "bg-blue-600 border-blue-600 text-blue-50",
    indigo: "bg-indigo-600 border-indigo-600 text-indigo-50",
    green: "bg-emerald-600 border-emerald-600 text-emerald-50",
    gray: "bg-gray-900 border-gray-900 text-gray-50",
  };

  const arrowStyles = {
    blue: "border-t-blue-600",
    indigo: "border-t-indigo-600",
    green: "border-t-emerald-600",
    gray: "border-t-gray-900",
  };

  return (
    <div className="relative group w-full">
      <button
        disabled={disabled}
        onClick={onClick}
        className={`border rounded-xl py-3 flex flex-col items-center gap-1 text-sm w-full transition-all duration-100 ${
          disabled
            ? "bg-gray-50 text-gray-400 cursor-not-allowed"
            : "hover:bg-gray-100 bg-white"
        }`}
      >
        {icon}
        <span className="font-medium whitespace-nowrap px-2 text-center">{label}</span>
      </button>

      {title && (
        <div className={`
          absolute bottom-[calc(100%+8px)] left-1/2 -translate-x-1/2
          text-white text-[11px] px-2.5 py-1.5 rounded-md
          whitespace-nowrap opacity-0 group-hover:opacity-100
          transition-all duration-100 pointer-events-none z-[60]
          shadow-xl translate-y-1 group-hover:translate-y-0
          ${variantStyles[tooltipVariant]}
        `}>
          {title}
          <div className={`
            absolute top-full left-1/2 -translate-x-1/2
            border-[5px] border-transparent
            ${arrowStyles[tooltipVariant]}
          `} />
        </div>
      )}
    </div>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
