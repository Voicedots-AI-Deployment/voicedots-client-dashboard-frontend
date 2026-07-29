import { useState } from "react";
import { Phone, User, Hash, Bot, Info } from "lucide-react";

/**
 * AI Calling — outbound voice, mirroring the admin dashboard's Voice Outbound
 * Caller so clients can see the capability.
 *
 * Deliberately inert: the trigger endpoints (/calls/agents, /calls/trigger) live
 * on the admin backend and are not exposed on the client API yet, so the form is
 * shown but disabled rather than wired to something that would fail.
 */

const card =
  "bg-[#161722] ring-1 ring-white/5 rounded-2xl overflow-hidden";
const label =
  "text-[10px] font-bold uppercase tracking-widest text-slate-400";
const input =
  "mt-1.5 w-full rounded-xl px-3 py-2.5 text-sm bg-[#0B0B13] ring-1 ring-white/5 text-white placeholder:text-slate-400 outline-none disabled:opacity-60 disabled:cursor-not-allowed transition";

export default function CallingPage() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">AI Calling</h1>
        <p className="text-sm text-slate-400 mt-1">
          Initiate outgoing voice engagement using your pre-configured conversational AI agents.
        </p>
      </div>

      <div className="flex items-start gap-2 rounded-xl border border-indigo-200 bg-[#7B3FE4]/15 px-4 py-3 text-sm text-indigo-800">
        <Info size={16} className="mt-0.5 shrink-0" />
        <span>
          Outbound calling is being enabled for your account. The setup is shown here so you can see
          what's coming — it isn't active yet.
        </span>
      </div>

      <section className={card}>
        <div className="px-6 py-4 border-b border-white/5 flex items-center gap-2">
          <Phone size={14} className="text-[#B79BFF]" />
          <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">
            New Outbound Call
          </h2>
        </div>

        <form className="p-6 space-y-5" onSubmit={(e) => e.preventDefault()}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className={label}>
                <User size={11} className="inline mr-1 -mt-0.5" />
                Contact Name
              </label>
              <input
                className={input}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter contact name (e.g. John Doe)"
                disabled
              />
            </div>
            <div>
              <label className={label}>
                <Hash size={11} className="inline mr-1 -mt-0.5" />
                Phone Number
              </label>
              <input
                className={input}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 7464979479 or +15550199"
                disabled
              />
            </div>
            <div className="sm:col-span-2">
              <label className={label}>
                <Bot size={11} className="inline mr-1 -mt-0.5" />
                Agent
              </label>
              <select className={input} disabled defaultValue="">
                <option value="">Select an Agent</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-gradient-to-r from-[#7B3FE4] to-[#4B22F4] text-white rounded-xl font-semibold text-sm shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Phone size={16} /> Initiate Call
          </button>
        </form>
      </section>
    </div>
  );
}
