import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  CheckCheck,
  ChevronRight,
  MessageCircle,
  Search,
  Send,
  UserRound,
  X,
} from "lucide-react";
import type { Account, Message, Template, Thread } from "@/api/whatsapp";
import { whatsappApi as api } from "@/api/whatsapp";
import { card, secondary, emptyPage, errorText } from "./shared";
import { Badge, Pager } from "./WhatsAppUi";
import Single from "./SingleMessageTab";

function initials(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((s) => s[0])
      .join("")
      .toUpperCase() || "#"
  );
}
function Avatar({ name, large = false }: { name: string; large?: boolean }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-indigo-600 font-semibold text-white ${large ? "h-16 w-16 text-xl" : "h-10 w-10 text-sm"}`}
    >
      {initials(name)}
    </span>
  );
}

export default function Messages({
  accountId,
  campaignId,
  account,
  templates = [],
}: {
  accountId: string;
  campaignId?: string;
  account?: Account;
  templates?: Template[];
}) {
  const [threads, setThreads] = useState(emptyPage<Thread>()),
    [offset, setOffset] = useState(0),
    [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Thread | null>(null),
    [mobileOpen, setMobileOpen] = useState(false),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const rows = await api.threads(accountId, offset, search, campaignId);
        if (active) {
          setThreads(rows);
          setError("");
        }
      } catch (e) {
        if (active) setError(errorText(e));
      } finally {
        if (active) setLoading(false);
      }
    };
    const timeout = window.setTimeout(load, 200);
    const timer = window.setInterval(load, 5000);
    return () => {
      active = false;
      window.clearTimeout(timeout);
      window.clearInterval(timer);
    };
  }, [accountId, campaignId, offset, search]);
  const current =
    (selected &&
      threads.items.find((t) => t.destination === selected.destination)) ||
    selected ||
    threads.items[0];
  return (
    <section
      className={`${card} overflow-hidden`}
      aria-label={campaignId ? "Campaign conversations" : "WhatsApp inbox"}
    >
      {error && (
        <div
          role="alert"
          className="border-b border-rose-100 p-4 text-sm text-rose-600"
        >
          {error}
        </div>
      )}
      <div className="grid min-h-[650px] lg:h-[calc(100dvh-250px)] lg:min-h-[620px] lg:grid-cols-[260px_minmax(0,1fr)] 2xl:grid-cols-[280px_minmax(0,1fr)]">
        <aside
          className={`flex min-h-0 flex-col border-r border-violet-100 dark:border-slate-800 ${mobileOpen ? "hidden lg:flex" : ""}`}
        >
          <div className="space-y-4 p-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">
                {campaignId ? "Recipients" : "Conversations"}
              </h2>
              <span className="rounded-full bg-violet-50 px-2 py-1 text-xs text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                {threads.total}
              </span>
            </div>
            <label className="flex items-center gap-2 rounded-xl bg-violet-50/70 px-3 py-2.5 dark:bg-slate-950">
              <Search size={15} className="shrink-0 text-slate-400" />
              <input
                aria-label="Search conversations"
                className="min-w-0 w-full bg-transparent text-sm outline-none"
                placeholder="Search name or number…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setOffset(0);
                  setSelected(null);
                }}
              />
            </label>
            <p className="text-xs font-medium text-indigo-600 dark:text-indigo-300">
              All {campaignId ? "campaign recipients" : "conversations"}
            </p>
          </div>
          <div className="min-h-0 flex-1 space-y-1 overflow-y-auto px-2 pb-2">
            {loading && (
              <p className="p-4 text-sm text-slate-500">
                Loading conversations…
              </p>
            )}
            {!loading && !threads.total && (
              <p className="p-5 text-center text-sm text-slate-500">
                {search
                  ? "No matching conversations."
                  : "Your messages and replies will appear here."}
              </p>
            )}
            {threads.items.map((t) => (
              <button
                key={t.destination}
                aria-label={`Open conversation with ${t.contact_name || t.destination}`}
                aria-pressed={current?.destination === t.destination}
                onClick={() => {
                  setSelected(t);
                  setMobileOpen(true);
                }}
                className={`w-full rounded-2xl p-3 text-left transition-colors ${current?.destination === t.destination ? "bg-violet-100/80 dark:bg-indigo-950/60" : "hover:bg-violet-50 dark:hover:bg-slate-800"}`}
              >
                <div className="flex items-center gap-2.5">
                  <Avatar name={t.contact_name || t.destination} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-semibold">
                        {t.contact_name || t.destination}
                      </span>
                      <time className="shrink-0 text-[10px] text-slate-500">
                        {new Date(t.last_at).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        })}
                      </time>
                    </div>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      {t.destination}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <p className="min-w-0 flex-1 truncate text-xs text-slate-500">
                    {t.direction === "outbound" ? "You: " : ""}
                    {t.body}
                  </p>
                  <ChevronRight size={13} className="text-indigo-400" />
                </div>
              </button>
            ))}
          </div>
          <Pager
            size={30}
            total={threads.total}
            offset={offset}
            change={setOffset}
          />
        </aside>
        {current ? (
          <Conversation
            key={`${accountId}-${campaignId || ""}-${current.destination}`}
            thread={current}
            accountId={accountId}
            campaignId={campaignId}
            account={account}
            templates={templates}
            mobileOpen={mobileOpen}
            back={() => setMobileOpen(false)}
          />
        ) : (
          <div className="hidden items-center justify-center p-10 text-center text-slate-400 lg:flex">
            <div>
              <MessageCircle
                size={38}
                className="mx-auto mb-3 text-indigo-300"
              />
              <p>Select a conversation to read its messages.</p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
function Conversation({
  thread,
  accountId,
  campaignId,
  account,
  templates,
  mobileOpen,
  back,
}: {
  thread: Thread;
  accountId: string;
  campaignId?: string;
  account?: Account;
  templates: Template[];
  mobileOpen: boolean;
  back: () => void;
}) {
  const [messages, setMessages] = useState(emptyPage<Message>()),
    [offset, setOffset] = useState(0),
    [error, setError] = useState(""),
    [compose, setCompose] = useState(false),
    [notice, setNotice] = useState("");
  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const result = await api.messages(
          accountId,
          offset,
          thread.destination,
          campaignId,
        );
        if (active) {
          setMessages(result);
          setError("");
        }
      } catch (e) {
        if (active) setError(errorText(e));
      }
    };
    void load();
    const timer = window.setInterval(load, 5000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [accountId, campaignId, thread.destination, offset]);
  const ordered = [...messages.items].reverse();
  return (
    <div
      className={`min-h-0 min-w-0 xl:grid-cols-[minmax(0,1fr)_210px] xl:grid ${mobileOpen ? "grid h-[calc(100dvh-240px)] min-h-[580px] grid-cols-1 lg:h-auto" : "hidden lg:grid lg:grid-cols-1"}`}
    >
      <div className="flex min-h-0 min-w-0 flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-violet-100 px-4 py-4 dark:border-slate-800">
          <div className="flex min-w-0 items-center gap-3">
            <button
              className="lg:hidden"
              aria-label="Back to conversations"
              onClick={back}
            >
              <ArrowLeft size={20} />
            </button>
            <Avatar name={thread.contact_name || thread.destination} />
            <div className="min-w-0">
              <h3 className="truncate text-sm font-semibold">
                {thread.contact_name || thread.destination}
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                {thread.destination}
              </p>
            </div>
          </div>
          <span className="hidden rounded-full bg-violet-50 px-3 py-1 text-[11px] text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300 sm:block">
            WhatsApp
          </span>
        </header>
        <div
          className="min-h-0 flex-1 space-y-5 overflow-y-auto bg-[#f6f4ff] px-4 py-5 dark:bg-slate-950/60"
          aria-label="Conversation messages"
          aria-live="polite"
        >
          {error && (
            <p role="alert" className="text-sm text-rose-600">
              {error}
            </p>
          )}
          {messages.total > 50 && (
            <Pager offset={offset} total={messages.total} change={setOffset} />
          )}{" "}
          {!ordered.length && !error && (
            <p className="text-center text-sm text-slate-400">
              Loading messages…
            </p>
          )}
          {ordered.map((m, i) => {
            const day = new Date(m.created_at).toLocaleDateString(undefined, {
              month: "long",
              day: "numeric",
              year: "numeric",
            });
            const previous = ordered[i - 1];
            return (
              <div key={m.id}>
                {(!previous ||
                  new Date(previous.created_at).toDateString() !==
                    new Date(m.created_at).toDateString()) && (
                  <div className="mb-5 text-center">
                    <span className="rounded-full bg-white px-3 py-1.5 text-[10px] text-slate-500 dark:bg-slate-800">
                      {day}
                    </span>
                  </div>
                )}
                <article
                  className={`max-w-[90%] rounded-2xl p-4 text-sm shadow-sm sm:max-w-[82%] ${m.direction === "outbound" ? "ml-auto rounded-tr-sm bg-indigo-700 text-white" : "rounded-tl-sm bg-white text-slate-700 dark:bg-slate-800 dark:text-slate-100"}`}
                >
                  <p className="whitespace-pre-wrap break-words leading-relaxed">
                    {m.body}
                  </p>
                  <div
                    className={`mt-3 flex flex-wrap items-center justify-end gap-2 text-[10px] ${m.direction === "outbound" ? "text-indigo-100" : "text-slate-400"}`}
                  >
                    <time dateTime={m.created_at}>
                      {new Date(m.created_at).toLocaleTimeString(undefined, {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </time>
                    {m.direction === "outbound" && (
                      <>
                        <span>{m.status}</span>
                        {["delivered", "read"].includes(m.status) && (
                          <CheckCheck size={13} />
                        )}
                      </>
                    )}
                  </div>
                  {m.error && <p className="mt-2 text-xs">{m.error}</p>}
                </article>
              </div>
            );
          })}
        </div>
        <footer className="space-y-3 border-t border-violet-100 p-4 dark:border-slate-800">
          {notice && (
            <p
              role="status"
              className="text-sm text-indigo-600 dark:text-indigo-300"
            >
              {notice}
            </p>
          )}
          {account ? (
            <button
              disabled={!account.ready}
              onClick={() => setCompose(true)}
              className="flex w-full items-center justify-between gap-3 rounded-2xl bg-violet-50 px-4 py-3 text-left dark:bg-indigo-950/40 disabled:opacity-50"
            >
              <span>
                <span className="block text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                  Use an approved template
                </span>
                <span className="mt-1 block text-xs text-slate-500">
                  Send a personalized follow-up to this recipient
                </span>
              </span>
              <span className="rounded-full bg-indigo-700 p-2.5 text-white">
                <Send size={16} />
              </span>
            </button>
          ) : (
            <p className="text-xs text-slate-500">
              Open Inbox to send a template follow-up.
            </p>
          )}
        </footer>
      </div>
      <aside className="hidden overflow-y-auto border-l border-violet-100 p-5 dark:border-slate-800 xl:block">
        <div className="space-y-3 py-3 text-center">
          <Avatar name={thread.contact_name || thread.destination} large />
          <h3 className="break-words font-semibold">
            {thread.contact_name || "WhatsApp contact"}
          </h3>
          <span className="inline-flex rounded-full bg-violet-50 px-3 py-1 text-[10px] font-medium text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300">
            Recipient profile
          </span>
        </div>
        <div className="mt-5 space-y-5 rounded-2xl bg-violet-50/70 p-4 dark:bg-slate-950">
          <h4 className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            <UserRound size={13} />
            Contact details
          </h4>
          <dl className="space-y-4 text-xs">
            <div>
              <dt className="text-slate-400">WhatsApp number</dt>
              <dd className="mt-1 break-all font-medium">
                {thread.destination}
              </dd>
            </div>
            <div>
              <dt className="text-slate-400">
                Messages{campaignId ? " in campaign" : ""}
              </dt>
              <dd className="mt-1 font-medium">{thread.message_count}</dd>
            </div>
            <div>
              <dt className="text-slate-400">Latest activity</dt>
              <dd className="mt-1">
                {new Date(thread.last_at).toLocaleString()}
              </dd>
            </div>
            <div>
              <dt className="mb-2 text-slate-400">Latest message status</dt>
              <dd>
                <Badge value={thread.status} />
              </dd>
            </div>
          </dl>
        </div>
        <p className="mt-5 text-[11px] leading-relaxed text-slate-400">
          Details reflect this sender’s message history. Delivery and read
          receipts update when reported by WhatsApp.
        </p>
      </aside>
      {compose && account && (
        <TemplateDialog
          account={account}
          templates={templates}
          thread={thread}
          close={() => setCompose(false)}
          notify={setNotice}
        />
      )}
    </div>
  );
}
function TemplateDialog({
  account,
  templates,
  thread,
  close,
  notify,
}: {
  account: Account;
  templates: Template[];
  thread: Thread;
  close: () => void;
  notify: (s: string) => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [status, setStatus] = useState("");
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      onClose={close}
      className="m-auto max-h-[90dvh] w-[min(1000px,95vw)] overflow-y-auto rounded-3xl bg-[#f8f7ff] p-5 text-slate-900 backdrop:bg-slate-950/50 dark:bg-slate-950 dark:text-slate-100"
    >
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold">Template follow-up</h3>
        <button
          className={secondary}
          aria-label="Close template composer"
          onClick={() => ref.current?.close()}
        >
          <X size={18} />
        </button>
      </div>
      {status && (
        <p
          role="status"
          className="mb-4 rounded-xl bg-white p-3 text-sm dark:bg-slate-900"
        >
          {status}
        </p>
      )}
      <Single
        account={account}
        templates={templates}
        notify={(message) => {
          setStatus(message);
          notify(message);
        }}
        initialDestination={thread.destination}
        initialName={thread.contact_name}
      />
    </dialog>
  );
}
