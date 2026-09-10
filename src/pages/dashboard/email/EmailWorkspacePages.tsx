import { useEffect, useState } from "react";
import { Inbox, MailPlus, Send, Sparkles, FileText, Link2, Loader2 } from "lucide-react";
import emailApi, { type EmailAccount } from "@/api/emailApi";

type ThreadSummary = { id: string; subject?: string; unread_count: number };
type ThreadResponse = { threads: ThreadSummary[] };

function Empty({ icon: Icon, title, text }: { icon: typeof Inbox; title: string; text: string }) {
  return <div className="rounded-2xl border border-dashed border-violet-200 bg-white p-12 text-center dark:border-slate-700 dark:bg-slate-900"><Icon className="mx-auto text-indigo-600" size={30} /><h2 className="mt-4 font-bold">{title}</h2><p className="mt-2 text-sm text-slate-500">{text}</p></div>;
}

export function InboxPage() {
  const [state, setState] = useState<ThreadResponse | null>(null);
  useEffect(() => { emailApi.threads().then(setState).catch(() => setState({ threads: [] })); }, []);
  if (!state) return <Empty icon={Loader2} title="Loading inbox" text="Your connected mailbox is being prepared." />;
  if (!state.threads?.length) return <Empty icon={Inbox} title="No conversations yet" text="Connect an account or sync your mailbox to see conversations." />;
  return <div className="rounded-2xl border bg-white dark:border-slate-800 dark:bg-slate-900">{state.threads.map((x) => <div key={x.id} className="border-b p-4 last:border-0 dark:border-slate-800"><b>{x.subject || "(No subject)"}</b><p className="text-xs text-slate-500">{x.unread_count} unread</p></div>)}</div>;
}

export function SingleEmailPage() {
  const [accounts, setAccounts] = useState<EmailAccount[]>([]); const [message, setMessage] = useState("");
  useEffect(() => { emailApi.accounts().then(setAccounts).catch(() => setAccounts([])); }, []);
  const submit = async (event: React.FormEvent<HTMLFormElement>) => { event.preventDefault(); const form = new FormData(event.currentTarget); if (!accounts[0]) return setMessage("Connect an Email account first."); await emailApi.send({ account_id: accounts[0].id, to: [form.get("to")], subject: form.get("subject"), body_text: form.get("body"), body_html: "", idempotency_key: crypto.randomUUID() }); setMessage("Email queued successfully."); event.currentTarget.reset(); };
  return <form onSubmit={submit} className="space-y-4 rounded-2xl border bg-white p-6 dark:border-slate-800 dark:bg-slate-900"><h2 className="text-lg font-bold">New Email</h2><select className="w-full rounded-xl border p-3" disabled={!accounts.length}>{accounts.map(a => <option key={a.id}>{a.email_address}</option>)}</select><input name="to" type="email" required placeholder="Recipient" className="w-full rounded-xl border p-3" /><input name="subject" required placeholder="Subject" className="w-full rounded-xl border p-3" /><textarea name="body" required rows={10} placeholder="Write your message" className="w-full rounded-xl border p-3" /><button className="rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white"><Send className="mr-2 inline" size={16} />Send Email</button>{message && <p className="text-sm text-slate-500">{message}</p>}</form>;
}

export function TemplatesPage() { return <Empty icon={FileText} title="Create your first Email template" text="Templates can be reused in single Email, campaigns and automations." />; }
export function CampaignsPage() { return <Empty icon={MailPlus} title="Your first campaign starts here" text="Create personalized, validated and scheduled Email campaigns." />; }
export function AutomationsPage() { return <Empty icon={Sparkles} title="No Email automations" text="Build a trigger, condition, delay and template-based action." />; }

export function EmailSettingsPage() {
  const [accounts, setAccounts] = useState<EmailAccount[] | null>(null); const load = () => emailApi.accounts().then(setAccounts).catch(() => setAccounts([])); useEffect(() => { void load(); }, []);
  const connect = async (provider: "google" | "microsoft") => { const result = await emailApi.connect(provider); window.location.assign(result.authorization_url); };
  return <div className="space-y-5"><div className="flex flex-wrap gap-3"><button onClick={() => connect("google")} className="rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white"><Link2 className="mr-2 inline" size={16} />Connect Gmail</button><button onClick={() => connect("microsoft")} className="rounded-xl border bg-white px-5 py-3 font-semibold dark:bg-slate-900"><Link2 className="mr-2 inline" size={16} />Connect Outlook</button></div>{!accounts?.length ? <Empty icon={Link2} title="No Email account connected" text="Connect Gmail or Outlook securely using OAuth. VoiceDots never receives your password." /> : accounts.map(a => <div key={a.id} className="flex items-center justify-between rounded-2xl border bg-white p-5 dark:border-slate-800 dark:bg-slate-900"><div><b>{a.email_address}</b><p className="text-xs capitalize text-slate-500">{a.provider} · {a.status}</p></div><button onClick={async () => { await emailApi.disconnect(a.id); load(); }} className="text-sm font-semibold text-red-600">Disconnect</button></div>)}</div>;
}
