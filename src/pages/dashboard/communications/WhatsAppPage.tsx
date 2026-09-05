import { useCallback, useEffect, useState } from "react";
import {
  Loader2,
  MessageCircle,
  Inbox,
  LayoutTemplate,
  Megaphone,
  Send,
} from "lucide-react";
import type { Account, Template } from "@/api/whatsapp";
import { card, input, errorText } from "@/components/whatsapp/shared";
import { Field } from "@/components/whatsapp/WhatsAppUi";
import Campaigns from "@/components/whatsapp/CampaignsTab";
import Templates from "@/components/whatsapp/TemplatesTab";
import Single from "@/components/whatsapp/SingleMessageTab";
import Messages from "@/components/whatsapp/MessagesTab";
import { whatsappApi as api } from "@/api/whatsapp";
export default function WhatsAppPage() {
  const [accounts, setAccounts] = useState<Account[]>([]),
    [accountId, setAccountId] = useState("");
  const [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    api
      .settings()
      .then((data) => {
        if (active) {
          setAccounts(data.accounts);
          setAccountId(data.accounts[0]?.id || "");
        }
      })
      .catch((e) => {
        if (active) setError(errorText(e));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);
  const account = accounts.find((a) => a.id === accountId);
  return (
    <div className="min-h-[calc(100dvh-140px)] space-y-6 rounded-2xl bg-[#f9f8ff] p-3 text-slate-900 dark:bg-slate-950/30 dark:text-slate-100 sm:p-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-slate-500">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-600" />
            WhatsApp workspace
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">WhatsApp</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Manage conversations, follow-ups, and college campaigns from one
            workspace.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {account && (
            <div className="flex items-center gap-2 rounded-full bg-violet-100/60 px-4 py-2.5 text-xs dark:bg-indigo-950/50">
              <span
                className={`h-1.5 w-1.5 rounded-full ${account.ready ? "bg-emerald-500" : "bg-amber-500"}`}
              />
              <span>
                <span className="block font-medium">Meta Cloud API</span>
                <span className="text-[10px] text-slate-500">
                  {account.ready ? "Sender configured" : "Setup required"}
                </span>
              </span>
            </div>
          )}
          {accounts.length > 1 && (
            <Field label="College sender">
              <select
                className={input}
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.display_name}
                  </option>
                ))}
              </select>
            </Field>
          )}
        </div>
      </div>
      {loading ? (
        <div className={`${card} flex items-center gap-3 p-8`}>
          <Loader2 className="animate-spin" />
          Loading WhatsApp…
        </div>
      ) : error ? (
        <div role="alert" className={`${card} p-6 text-rose-600`}>
          {error}
        </div>
      ) : account ? (
        <Workspace key={account.id} account={account} />
      ) : (
        <div className={`${card} p-10 text-center`}>
          <MessageCircle className="mx-auto mb-3 text-violet-500" size={32} />
          <h2 className="text-lg font-semibold">
            Configure Meta WhatsApp to get started
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-sm text-slate-500">
            Share your WhatsApp Business Account ID (WABA ID), phone-number ID,
            and dashboard login email with your administrator. Access tokens
            belong in the backend’s secure configuration.
          </p>
          <p className="mx-auto mt-3 max-w-lg text-sm text-slate-500">
            After deployment, configure the Meta webhook with verify token
            <strong className="mx-1 text-indigo-700 dark:text-indigo-300">
              voicedotsai
            </strong>
            . Your templates, campaigns, and inbox will be available after your
            sender is linked.
          </p>
        </div>
      )}
    </div>
  );
}
function Workspace({ account }: { account: Account }) {
  const [tab, setTab] = useState("campaigns"),
    [templates, setTemplates] = useState<Template[]>([]),
    [notice, setNotice] = useState("");
  const refresh = useCallback(async () => {
    setTemplates(await api.templates(account.id));
  }, [account.id]);
  useEffect(() => {
    let active = true;
    api
      .templates(account.id)
      .then((rows) => {
        if (active) setTemplates(rows);
      })
      .catch((e) => {
        if (active) setNotice(errorText(e));
      });
    return () => {
      active = false;
    };
  }, [account.id]);
  return (
    <div className="space-y-5">
      {!account.ready && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/20 dark:text-amber-300">
          Sending is not enabled for {account.display_name}. You can prepare
          drafts and view history; contact your administrator to activate
          sending.
        </div>
      )}
      {notice && (
        <div
          role="status"
          className={`${card} flex items-center justify-between gap-3 p-4 text-sm`}
        >
          <span>{notice}</span>
          <button
            aria-label="Dismiss notification"
            onClick={() => setNotice("")}
          >
            ×
          </button>
        </div>
      )}
      <div
        className="flex gap-1 overflow-x-auto rounded-xl bg-white p-1.5 dark:bg-slate-900"
        role="tablist"
        aria-label="WhatsApp sections"
      >
        {(
          [
            ["messages", "Inbox", Inbox],
            ["templates", "Templates", LayoutTemplate],
            ["campaigns", "Campaigns", Megaphone],
            ["single", "Single message", Send],
          ] as const
        ).map(([key, label, Icon]) => (
          <button
            key={key}
            role="tab"
            aria-selected={tab === key}
            className={`inline-flex items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2.5 text-xs font-medium ${tab === key ? "bg-indigo-700 text-white shadow-sm" : "text-slate-500 hover:bg-violet-50 dark:hover:bg-slate-800"}`}
            onClick={() => {
              setTab(key);
              setNotice("");
            }}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>
      {tab === "campaigns" && (
        <Campaigns account={account} templates={templates} notify={setNotice} />
      )}
      {tab === "single" && (
        <Single account={account} templates={templates} notify={setNotice} />
      )}
      {tab === "templates" && (
        <Templates
          account={account}
          templates={templates}
          refresh={refresh}
          notify={setNotice}
        />
      )}
      {tab === "messages" && (
        <Messages
          accountId={account.id}
          account={account}
          templates={templates}
        />
      )}
    </div>
  );
}
