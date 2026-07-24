import { MessageCircle, Info, CheckCircle2 } from "lucide-react";

/**
 * WhatsApp — shown so clients can see the channel is part of the platform.
 * No backend is wired for it yet, so this stays informational.
 */

const card =
  "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden";

const CAPABILITIES = [
  "Answer enquiries on WhatsApp with the same AI that handles your website",
  "Continue a conversation that started as a voice call",
  "Send follow-ups to leads captured by the assistant",
  "Hand over to your team when a human is needed",
];

export default function WhatsAppPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">WhatsApp</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Reach visitors on WhatsApp with the same assistant that answers on your website.
        </p>
      </div>

      <div className="flex items-start gap-2 rounded-xl border border-indigo-200 dark:border-indigo-900 bg-indigo-50 dark:bg-indigo-900/20 px-4 py-3 text-sm text-indigo-800 dark:text-indigo-300">
        <Info size={16} className="mt-0.5 shrink-0" />
        <span>
          The WhatsApp channel is being set up for your account. It isn't active yet — this page
          shows what it will cover.
        </span>
      </div>

      <section className={card}>
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
          <MessageCircle size={14} className="text-indigo-500" />
          <h2 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
            What you'll be able to do
          </h2>
        </div>
        <ul className="p-6 space-y-3">
          {CAPABILITIES.map((c) => (
            <li key={c} className="flex items-start gap-3 text-sm text-slate-700 dark:text-slate-300">
              <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-slate-300 dark:text-slate-600" />
              {c}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
