import { useEffect, useState } from "react";
import { Inbox, MailPlus, Send, Sparkles, FileText, Link2, Loader2, Paperclip, RefreshCw } from "lucide-react";
import emailApi, { type EmailAccount, type EmailThread, type EmailThreadDetail } from "@/api/emailApi";

type ThreadResponse = { threads: EmailThread[] };

function Empty({ icon: Icon, title, text }: { icon: typeof Inbox; title: string; text: string }) {
  return <div className="rounded-2xl border border-dashed border-violet-200 bg-white p-12 text-center dark:border-slate-700 dark:bg-slate-900"><Icon className="mx-auto text-indigo-600" size={30} /><h2 className="mt-4 font-bold">{title}</h2><p className="mt-2 text-sm text-slate-500">{text}</p></div>;
}

export function InboxPage() {
  const [state, setState] = useState<ThreadResponse | null>(null);
  const [selected, setSelected] = useState<EmailThreadDetail | null>(null);
  const [notice, setNotice] = useState("");
  useEffect(() => { emailApi.threads().then(setState).catch(() => setState({ threads: [] })); }, []);
  if (!state) return <Empty icon={Loader2} title="Loading inbox" text="Your connected mailbox is being prepared." />;
  if (!state.threads?.length) return <Empty icon={Inbox} title="No conversations yet" text="Connect an account or sync your mailbox to see conversations." />;
  return <div className="grid gap-5 lg:grid-cols-[320px_1fr]"><div className="rounded-2xl border bg-white dark:border-slate-800 dark:bg-slate-900">{state.threads.map((x) => <button type="button" onClick={() => emailApi.thread(x.id).then(setSelected)} key={x.id} className="block w-full border-b p-4 text-left last:border-0 dark:border-slate-800"><b>{x.subject || "(No subject)"}</b><p className="text-xs text-slate-500">{x.participants?.join(", ")} · {x.unread_count} unread</p></button>)}</div>{selected ? <div className="space-y-4 rounded-2xl border bg-white p-5 dark:border-slate-800 dark:bg-slate-900"><h2 className="font-bold">{selected.subject || "(No subject)"}</h2>{selected.messages.map(item => <article key={item.id} className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800"><div className="mb-2 text-xs text-slate-500">{item.from} · {item.status}</div><div className="whitespace-pre-wrap text-sm">{item.body_text}</div></article>)}<form onSubmit={async event => { event.preventDefault(); const form = new FormData(event.currentTarget); await emailApi.reply(selected.id, { body_text: form.get("body"), body_html: "", idempotency_key: crypto.randomUUID(), attachment_ids: [] }); setNotice("Reply queued."); event.currentTarget.reset(); }} className="space-y-3"><textarea name="body" required rows={5} placeholder="Reply" className="w-full rounded-xl border p-3"/><button className="rounded-xl bg-indigo-600 px-4 py-2 font-semibold text-white">Reply</button>{notice && <span className="ml-3 text-sm text-slate-500">{notice}</span>}</form></div> : <Empty icon={Inbox} title="Select a conversation" text="Choose a thread to view messages and reply." />}</div>;
}

export function SingleEmailPage() {
  const [accounts, setAccounts] = useState<EmailAccount[]>([]); const [message, setMessage] = useState("");
  useEffect(() => { emailApi.accounts().then(setAccounts).catch(() => setAccounts([])); }, []);
  const submit = async (event: React.FormEvent<HTMLFormElement>) => { event.preventDefault(); const form = new FormData(event.currentTarget); if (!accounts[0]) return setMessage("Connect an Email account first."); const files = form.getAll("attachments").filter((value): value is File => value instanceof File && value.size > 0); const uploaded = await Promise.all(files.map(file => emailApi.uploadAttachment(file))); await emailApi.send({ account_id: accounts[0].id, to: [form.get("to")], subject: form.get("subject"), body_text: form.get("body"), body_html: "", attachment_ids: uploaded.map(x => x.id), idempotency_key: crypto.randomUUID() }); setMessage("Email queued successfully."); event.currentTarget.reset(); };
  return <form onSubmit={submit} className="space-y-4 rounded-2xl border bg-white p-6 dark:border-slate-800 dark:bg-slate-900"><h2 className="text-lg font-bold">New Email</h2><select className="w-full rounded-xl border p-3" disabled={!accounts.length}>{accounts.map(a => <option key={a.id}>{a.email_address}</option>)}</select><input name="to" type="email" required placeholder="Recipient" className="w-full rounded-xl border p-3" /><input name="subject" required placeholder="Subject" className="w-full rounded-xl border p-3" /><textarea name="body" required rows={10} placeholder="Write your message" className="w-full rounded-xl border p-3" /><label className="block rounded-xl border border-dashed p-3 text-sm"><Paperclip className="mr-2 inline" size={16}/>Attachments<input name="attachments" type="file" multiple className="ml-3" /></label><button className="rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white"><Send className="mr-2 inline" size={16} />Send Email</button>{message && <p className="text-sm text-slate-500">{message}</p>}</form>;
}

export function TemplatesPage() { return <Empty icon={FileText} title="Create your first Email template" text="Templates can be reused in single Email, campaigns and automations." />; }
export function CampaignsPage() { return <Empty icon={MailPlus} title="Your first campaign starts here" text="Create personalized, validated and scheduled Email campaigns." />; }
export function AutomationsPage() { return <Empty icon={Sparkles} title="No Email automations" text="Build a trigger, condition, delay and template-based action." />; }

export function EmailSettingsPage() {
  const [accounts, setAccounts] = useState<EmailAccount[] | null>(null); const load = () => emailApi.accounts().then(setAccounts).catch(() => setAccounts([])); useEffect(() => { void load(); }, []);
  const connect = async (provider: "google" | "microsoft") => { const result = await emailApi.connect(provider); window.location.assign(result.authorization_url); };
  return <div className="space-y-5"><div className="flex flex-wrap gap-3">{!accounts?.some(a => a.status !== "disconnected") && <button onClick={() => connect("google")} className="rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white"><Link2 className="mr-2 inline" size={16} />Connect test Gmail</button>}</div>{!accounts?.length ? <Empty icon={Link2} title="No Email account connected" text="Connect the pilot Gmail mailbox securely using OAuth. VoiceDots never receives your password." /> : accounts.map(a => <div key={a.id} className="flex items-center justify-between rounded-2xl border bg-white p-5 dark:border-slate-800 dark:bg-slate-900"><div><b>{a.email_address}</b><p className="text-xs capitalize text-slate-500">{a.provider} · {a.status}{a.last_sync_at ? ` · synced ${new Date(a.last_sync_at).toLocaleString()}` : ""}</p></div><div className="flex gap-3"><button onClick={async () => { await emailApi.sync(a.id); }} className="text-sm font-semibold text-indigo-600"><RefreshCw className="mr-1 inline" size={14}/>Sync</button><button onClick={async () => { await emailApi.disconnect(a.id); load(); }} className="text-sm font-semibold text-red-600">Disconnect</button></div></div>)}</div>;
}
