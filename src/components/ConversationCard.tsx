import { MessageSquare, ChevronRight } from "lucide-react";
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

  return (
    <div
      onClick={() => navigate(`./${conversation.conversation_id}`)}
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
      "
    >
      <div className="flex items-center justify-between gap-6">
        {/* LEFT CONTENT */}
        <div className="min-w-0 flex-1">
          {/* Title */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400 font-black px-2 py-0.5 rounded-md bg-slate-50 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
              {index}
            </span>
            <p className="truncate text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
              {conversation.title || "Untitled Conversation"}
            </p>
          </div>

          {/* Meta */}
          <div className="mt-2 flex flex-wrap items-center gap-x-6 gap-y-2">
            <div className="flex items-center gap-2 px-2 py-1 rounded-lg bg-slate-50/50 border border-slate-100 text-[11px] font-mono text-slate-400">
              <span className="opacity-50">ID:</span>
              <span className="truncate max-w-[120px] sm:max-w-none">{conversation.conversation_id}</span>
            </div>

            <div className="flex items-center gap-2 text-[12px] font-bold text-slate-500">
              <MessageSquare size={14} className="text-slate-300" />
              <span>{conversation.message_count} messages</span>
            </div>
          </div>
        </div>

        {/* RIGHT SIDE */}
        <div className="flex items-center gap-8 shrink-0">
          <div className="hidden md:block text-right">
            <p className="text-xs text-slate-400 font-bold tracking-tight whitespace-nowrap">
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
            <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-indigo-50 group-hover:text-indigo-500 transition-all">
              <ChevronRight size={18} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
