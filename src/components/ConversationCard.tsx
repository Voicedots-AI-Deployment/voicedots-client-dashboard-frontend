import { ChevronRight, Clock3, Globe2, MessageSquareText, Phone } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { ConversationsListSummary } from "@/types/conversation.types";

interface ConversationCardProps { conversation: ConversationsListSummary; index: number; }

const CATEGORY_TONE: Record<string, string> = {
  "Follow Up": "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300",
  Interested: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300",
  "General Inquiry": "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900 dark:bg-violet-950/40 dark:text-violet-300",
  "Not Interested": "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300",
  "Callback Required": "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300",
  "Not Assessable": "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300",
};

function formatDuration(seconds = 0) {
  if (!seconds) return "No duration";
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return minutes ? `${minutes}m ${remainder}s` : `${remainder}s`;
}

export function ConversationCard({ conversation, index }: ConversationCardProps) {
  const navigate = useNavigate();
  const isPhone = conversation.source === "phone_call" || conversation.source === "phone";
  const category = conversation.category || "Not Assessable";
  const SourceIcon = isPhone ? Phone : Globe2;

  return (
    <button
      type="button"
      onClick={() => navigate(`./${conversation.conversation_id}`, { state: { source: conversation.source } })}
      className="group grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-4 text-left shadow-sm transition hover:border-slate-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 sm:gap-6 sm:px-5 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
    >
      <div className="flex min-w-0 items-start gap-3 sm:items-center sm:gap-4">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold tabular-nums text-slate-500 dark:bg-slate-800 dark:text-slate-400">{index}</span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900 transition group-hover:text-indigo-700 sm:text-[15px] dark:text-slate-100 dark:group-hover:text-indigo-300">{conversation.title || "Untitled conversation"}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
            <span className="inline-flex items-center gap-1.5"><SourceIcon size={13} />{isPhone ? "Phone" : "Website"}</span>
            <span className="hidden items-center gap-1.5 sm:inline-flex"><Clock3 size={13} />{formatDuration(conversation.duration)}</span>
            <span className="hidden items-center gap-1.5 md:inline-flex"><MessageSquareText size={13} />{conversation.message_count || 0} messages</span>
            <span className="hidden lg:inline">{new Date(conversation.start_time * 1000).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}</span>
          </div>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2 sm:gap-4">
        <span className={`max-w-[112px] rounded-full border px-2.5 py-1 text-center text-[10px] font-bold leading-4 sm:max-w-none sm:px-3 sm:text-xs ${CATEGORY_TONE[category] || CATEGORY_TONE["Not Assessable"]}`}>{category}</span>
        <span className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition group-hover:bg-slate-100 group-hover:text-slate-700 dark:group-hover:bg-slate-800 dark:group-hover:text-slate-200"><ChevronRight size={18} /></span>
      </div>
    </button>
  );
}
