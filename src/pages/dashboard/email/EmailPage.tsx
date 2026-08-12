import { useCallback, useEffect, useState } from "react";
import {
  Mail, Loader2, CheckCircle2, AlertCircle, ShieldCheck, RefreshCw, Globe, Send,
  FileText, Trash2,
} from "lucide-react";
import communicationAPI, {
  type EmailSettings, type DnsRecord, type EmailTemplateSummary,
} from "@/api/communication";

const errorDetail = (e: unknown): string => {
  if (e && typeof e === "object" && "response" in e) {
    const detail = (e as { response?: { data?: { detail?: unknown } } }).response?.data?.detail;
    if (typeof detail === "string") return detail;
  }
  return "";
};

const card =
  "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden";
const cardHead =
  "px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2";
const headText =
  "text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest";
const label =
  "text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400";
const input =
  "mt-1.5 w-full rounded-xl px-3 py-2.5 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-indigo-400/50 transition";

function statusPill(status: string | null) {
  const s = (status || "").toLowerCase();
  const ok = s === "verified" || s === "active";
  const pending = s === "pending" || s === "not_started";
  const cls = ok
    ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800"
    : pending
    ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800"
    : "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700";
  return (
    <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border ${cls}`}>
      {status ? status : "Not configured"}
    </span>
  );
}

type Tab = "sender" | "templates";

export default function EmailPage() {
  const [tab, setTab] = useState<Tab>("sender");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight leading-tight text-slate-900 dark:text-slate-100">
          Email
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Configure your sending identity, verify your domain, and manage reply templates.
        </p>
      </div>

      {/* TABS */}
      <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1 shadow-sm ring-1 ring-slate-100 w-fit dark:bg-slate-900 dark:border-slate-800 dark:ring-slate-800">
        {([
          ["sender", "Sender Config"],
          ["templates", "Templates"],
        ] as [Tab, string][]).map(([key, labelTab]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`h-9 px-5 rounded-lg text-xs font-bold transition-all ${
              tab === key
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-100"
                : "text-slate-500 hover:text-slate-900 hover:bg-slate-50 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            {labelTab}
          </button>
        ))}
      </div>

      {tab === "sender" ? <SenderConfigSection /> : <TemplatesSection />}
    </div>
  );
}

/* ================= SENDER CONFIG ================= */

function SenderConfigSection() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [settings, setSettings] = useState<EmailSettings | null>(null);
  const [fromName, setFromName] = useState("");
  const [fromEmail, setFromEmail] = useState("");
  const [replyTo, setReplyTo] = useState("");
  const [signature, setSignature] = useState("");
  const [autoReply, setAutoReply] = useState(false);

  const [dnsRecords, setDnsRecords] = useState<DnsRecord[]>([]);

  const hydrate = (s: EmailSettings) => {
    setSettings(s);
    setFromName(s.from_name ?? "");
    setFromEmail(s.from_email ?? "");
    setReplyTo(s.reply_to ?? "");
    setSignature(s.signature ?? "");
    setAutoReply(!!s.auto_reply_enabled);
    setDnsRecords(s.dns_records ?? []);
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const s = await communicationAPI.getEmailSettings();
      hydrate(s);
    } catch (e) {
      setError(errorDetail(e) || "Could not load email settings.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const updated = await communicationAPI.updateEmailSettings({
        from_name: fromName || null,
        from_email: fromEmail || null,
        reply_to: replyTo || null,
        signature: signature || null,
        auto_reply_enabled: autoReply,
      });
      if (updated && typeof updated === "object" && "from_email" in updated) hydrate(updated);
      setSuccess("Sender configuration saved.");
    } catch (e) {
      setError(errorDetail(e) || "Could not save sender configuration.");
    } finally {
      setSaving(false);
    }
  };

  const verify = async () => {
    setVerifying(true);
    setError("");
    setSuccess("");
    try {
      await communicationAPI.verifyDomain();
      const dns = await communicationAPI.getDnsRecords();
      setDnsRecords(dns.dns_records ?? []);
      setSettings((p) => (p ? { ...p, domain_status: dns.domain_status } : p));
      setSuccess("Domain check complete.");
    } catch (e) {
      setError(errorDetail(e) || "Domain verification failed.");
    } finally {
      setVerifying(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-500 dark:text-slate-400">
        <Loader2 className="animate-spin mr-2" size={18} /> Loading communications…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-700 dark:text-red-400">
          <AlertCircle size={16} className="mt-0.5 shrink-0" /> {error}
        </div>
      )}
      {success && (
        <div className="flex items-start gap-2 rounded-xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-900/20 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-400">
          <CheckCircle2 size={16} className="mt-0.5 shrink-0" /> {success}
        </div>
      )}

      {/* ── Sender configuration ── */}
      <section className={card}>
        <div className={cardHead}>
          <Mail size={14} className="text-indigo-500" />
          <h2 className={headText}>Sender Configuration</h2>
        </div>
        <form onSubmit={save} className="p-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className={label}>Sender Name</label>
              <input className={input} value={fromName} placeholder="Admissions Office"
                onChange={(e) => setFromName(e.target.value)} />
            </div>
            <div>
              <label className={label}>Sender Email</label>
              <input className={input} type="email" value={fromEmail} placeholder="admissions@yourdomain.edu"
                onChange={(e) => setFromEmail(e.target.value)} />
            </div>
            <div>
              <label className={label}>Reply-To</label>
              <input className={input} type="email" value={replyTo} placeholder="optional"
                onChange={(e) => setReplyTo(e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <label className={label}>Signature</label>
              <textarea className={`${input} min-h-[90px]`} value={signature}
                placeholder="Warm regards, Admissions Team"
                onChange={(e) => setSignature(e.target.value)} />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-800 px-4 py-3">
            <div className="flex items-start gap-3">
              <Send size={16} className="mt-0.5 text-indigo-500" />
              <div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Auto-Reply</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Automatically email a visitor after they leave their details.
                </p>
              </div>
            </div>
            <button type="button" role="switch" aria-checked={autoReply}
              onClick={() => setAutoReply((v) => !v)}
              className={`relative h-6 w-11 rounded-full transition-colors ${
                autoReply ? "bg-indigo-600" : "bg-slate-300 dark:bg-slate-700"}`}>
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${
                autoReply ? "left-[22px]" : "left-0.5"}`} />
            </button>
          </div>

          <div className="flex justify-end">
            <button type="submit" disabled={saving}
              className="px-8 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-bold rounded-xl transition-all flex items-center gap-2 active:scale-95">
              {saving && <Loader2 size={16} className="animate-spin" />} Save Changes
            </button>
          </div>
        </form>
      </section>

      {/* ── Sending domain ── */}
      <section className={card}>
        <div className={`${cardHead} justify-between`}>
          <div className="flex items-center gap-2">
            <Globe size={14} className="text-indigo-500" />
            <h2 className={headText}>Sending Domain</h2>
          </div>
          <div className="flex items-center gap-3">
            {statusPill(settings?.domain_status ?? null)}
            <button onClick={verify} disabled={verifying}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-60 flex items-center gap-1.5">
              {verifying ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />} Verify
            </button>
          </div>
        </div>
        <div className="p-6">
          {dnsRecords.length === 0 ? (
            <div className="text-center py-8">
              <ShieldCheck className="mx-auto text-slate-300 dark:text-slate-700" size={32} />
              <p className="mt-3 text-sm text-slate-600 dark:text-slate-300 font-medium">
                No DNS records yet
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                Save a sender email on your own domain, then hit Verify — the records your IT team
                must publish will appear here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    <th className="py-2 pr-4 font-bold">Type</th>
                    <th className="py-2 pr-4 font-bold">Name</th>
                    <th className="py-2 pr-4 font-bold">Value</th>
                    <th className="py-2 font-bold">Status</th>
                  </tr>
                </thead>
                <tbody className="text-slate-700 dark:text-slate-300">
                  {dnsRecords.map((r, i) => (
                    <tr key={i} className="border-t border-slate-100 dark:border-slate-800 align-top">
                      <td className="py-2.5 pr-4 font-mono text-xs">{String(r.type ?? r.record ?? "—")}</td>
                      <td className="py-2.5 pr-4 font-mono text-xs break-all">{String(r.name ?? "—")}</td>
                      <td className="py-2.5 pr-4 font-mono text-xs break-all">{String(r.value ?? "—")}</td>
                      <td className="py-2.5">{statusPill((r.status as string) ?? null)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

/* ================= TEMPLATES ================= */

function TemplatesSection() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [templates, setTemplates] = useState<EmailTemplateSummary[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setTemplates(await communicationAPI.listTemplates());
      setError("");
    } catch (e) {
      setError(errorDetail(e) || "Templates are unavailable right now.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const remove = async (id: string) => {
    try {
      await communicationAPI.deleteTemplate(id);
      setTemplates((t) => t.filter((x) => x.id !== id));
    } catch {
      setError("Could not delete that template.");
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-900/20 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
          <AlertCircle size={16} className="mt-0.5 shrink-0" /> {error}
        </div>
      )}

      <section className={card}>
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-slate-500 dark:text-slate-400">
              <Loader2 className="animate-spin mr-2" size={18} /> Loading templates…
            </div>
          ) : templates.length === 0 ? (
            <div className="text-center py-12">
              <div className="mx-auto h-14 w-14 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                <FileText className="text-slate-400 dark:text-slate-500" size={24} />
              </div>
              <p className="mt-4 text-base font-semibold text-slate-800 dark:text-slate-200">
                No templates yet
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Templates you create will appear here.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {templates.map((t) => (
                <li key={t.id} className="py-3 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
                      {t.name}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {t.subject || "No subject"}
                      {t.updated_at && ` · updated ${new Date(t.updated_at).toLocaleDateString()}`}
                    </p>
                  </div>
                  <button
                    onClick={() => remove(t.id)}
                    title="Delete template"
                    className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors shrink-0"
                  >
                    <Trash2 size={16} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
