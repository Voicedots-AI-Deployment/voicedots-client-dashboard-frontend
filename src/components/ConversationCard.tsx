import { ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { ConversationsListSummary } from "@/types/conversation.types";

interface ConversationCardProps {
  conversation: ConversationsListSummary;
  index: number;
}

export function ConversationCard({
  conversation,
  index,
}: ConversationCardProps) {
  const navigate = useNavigate();

  const isPhone =
    conversation.source === "phone_call" || conversation.source === "phone";

  const isSuccess =
    conversation.call_status === "done" ||
    conversation.call_status === "success" ||
    conversation.call_status === true;

  const status = isSuccess
    ? {
      label: "Successful",
      bg: "bg-emerald-50",
      text: "text-emerald-600",
      border: "border-emerald-100",
    }
    : {
      label: "Unsuccessful",
      bg: "bg-amber-50",
      text: "text-amber-600",
      border: "border-amber-100",
    };

  const categoryTone: Record<string, string> = {
    "Follow Up": "bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-950/30 dark:text-blue-300",
    "Interested": "bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-300",
    "General Inquiry": "bg-violet-50 text-violet-700 border-violet-100 dark:bg-violet-950/30 dark:text-violet-300",
    "Not Interested": "bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-950/30 dark:text-rose-300",
    "Callback Required": "bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-950/30 dark:text-amber-300",
    "Not Assessable": "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300",
  };

  return (
    <div
      onClick={() => navigate(`./${conversation.conversation_id}`, { state: { source: conversation.source } })}
      className="
        group
        cursor-pointer
        rounded-2xl
        border border-slate-100
        bg-white
        px-6 py-5
        transition-all duration-300
        hover:shadow-xl hover:shadow-indigo-500/5
        hover:border-indigo-100/50
        hover:-translate-y-0.5
       dark:bg-slate-900 dark:border-slate-800"
    >
      <div className="flex items-center justify-between gap-6">
        {/* LEFT CONTENT */}
        <div className="min-w-0 flex-1">
          {/* Title */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400 font-black px-2 py-0.5 rounded-md bg-slate-50 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors dark:bg-slate-800 dark:text-slate-400 dark:group-hover:text-indigo-300">
              {index}
            </span>
            <p className="truncate text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors dark:text-slate-100">
              {conversation.title || "Untitled Conversation"}
            </p>
            <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider shrink-0 ${isPhone ? 'bg-violet-50 text-violet-700 dark:bg-violet-950/30 dark:text-violet-300' : 'bg-sky-50 text-sky-700 dark:bg-sky-950/30 dark:text-sky-300'}`}>
              {isPhone ? 'Phone' : 'Website'}
            </span>
            {conversation.category && <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${categoryTone[conversation.category] || categoryTone["Not Assessable"]}`}>{conversation.category}</span>}
          </div>
        </div>

        {/* RIGHT SIDE */}
        <div className="flex items-center gap-8 shrink-0">
          <div className="hidden md:block text-right">
            <p className="text-xs text-slate-400 font-bold tracking-tight whitespace-nowrap dark:text-slate-500">
              {new Date(conversation.start_time * 1000).toLocaleString(undefined, {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </p>
          </div>

          <div className="flex items-center gap-4">
            {/* STATUS */}
            <div className="w-[110px] flex justify-center">
              <span
                className={`
                  px-4 py-1.5
                  rounded-xl
                  text-[10px] font-black uppercase tracking-widest
                  shadow-sm border
                  ${status.bg} ${status.text} ${status.border}
                `}
              >
                {status.label}
              </span>
            </div>

            {/* ARROW */}
            <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-indigo-50 group-hover:text-indigo-500 transition-all dark:bg-slate-800 dark:text-slate-500 dark:group-hover:bg-indigo-900/30 dark:group-hover:text-indigo-300">
              <ChevronRight size={18} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
