import { useCallback, useEffect, useState } from "react";
import {
  Copy,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Send,
  Trash2,
} from "lucide-react";
import type { Account, Template } from "@/api/whatsapp";
import { whatsappApi as api } from "@/api/whatsapp";
import { card, button, secondary, errorText } from "./shared";
import { Badge } from "./WhatsAppUi";
import TemplateBuilder from "./TemplateBuilder";
import TemplatePreview from "./TemplatePreview";
import { structureOf } from "./templateRules";

const STATUSES = [
  "all",
  "DRAFT",
  "PENDING",
  "APPROVED",
  "REJECTED",
  "PAUSED",
  "DISABLED",
];
const SORTS = [
  { value: "updated", label: "Last updated" },
  { value: "created", label: "Newest" },
  { value: "name", label: "Name" },
  { value: "status", label: "Status" },
];
/** Meta will not reopen a template once it leaves DRAFT; those are duplicated instead. */
const EDITABLE = "DRAFT";

const filterSelect =
  "rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950";

export default function Templates({
  account,
  templates,
  refresh,
  notify,
}: {
  account: Account;
  templates: Template[];
  refresh: () => Promise<void>;
  notify: (s: string) => void;
}) {
  const [rows, setRows] = useState<Template[]>(templates),
    [loading, setLoading] = useState(false),
    [busy, setBusy] = useState(false);
  const [search, setSearch] = useState(""),
    [status, setStatus] = useState("all"),
    [category, setCategory] = useState("all"),
    [language, setLanguage] = useState("all"),
    [sort, setSort] = useState("updated");
  const [building, setBuilding] = useState(false),
    [editing, setEditing] = useState<Template>();
  const languages = [...new Set(templates.map((t) => t.language))].sort();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(
        await api.templates(account.id, {
          search,
          status,
          category,
          language,
          sort,
        }),
      );
    } catch (e) {
      notify(errorText(e));
    } finally {
      setLoading(false);
    }
  }, [account.id, search, status, category, language, sort, notify]);
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 200);
    return () => window.clearTimeout(timer);
  }, [load]);

  const action = async (work: () => Promise<unknown>, message: string) => {
    setBusy(true);
    try {
      await work();
      await Promise.all([refresh(), load()]);
      notify(message);
    } catch (e) {
      notify(errorText(e));
    } finally {
      setBusy(false);
    }
  };

  if (building || editing)
    return (
      <TemplateBuilder
        account={account}
        editing={editing}
        refresh={async () => {
          await Promise.all([refresh(), load()]);
        }}
        notify={notify}
        done={() => {
          setBuilding(false);
          setEditing(undefined);
        }}
      />
    );

  return (
    <section className={`${card} overflow-hidden`}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-5 dark:border-slate-800">
        <div>
          <h2 className="text-lg font-bold">Message templates</h2>
          <p className="mt-1 text-sm text-slate-500">
            {rows.length} of {templates.length} template
            {templates.length === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            disabled={busy}
            className={secondary}
            onClick={() =>
              action(
                () => api.sync(account.id),
                "Templates synchronized with Meta.",
              )
            }
          >
            <RefreshCw size={16} />
            Sync
          </button>
          <button className={button} onClick={() => setBuilding(true)}>
            <Plus size={16} />
            New template
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-slate-200 p-4 dark:border-slate-800">
        <label className="flex min-w-[200px] flex-1 items-center gap-2 rounded-xl bg-violet-50/70 px-3 py-2 dark:bg-slate-950">
          <Search size={15} className="shrink-0 text-slate-400" />
          <input
            aria-label="Search templates"
            className="w-full min-w-0 bg-transparent text-sm outline-none"
            placeholder="Search name or wording…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <select
          aria-label="Filter by status"
          className={filterSelect}
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s === "all" ? "All statuses" : s}
            </option>
          ))}
        </select>
        <select
          aria-label="Filter by category"
          className={filterSelect}
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="all">All categories</option>
          <option value="MARKETING">Marketing</option>
          <option value="UTILITY">Utility</option>
        </select>
        <select
          aria-label="Filter by language"
          className={filterSelect}
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
        >
          <option value="all">All languages</option>
          {languages.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
        <select
          aria-label="Sort templates"
          className={filterSelect}
          value={sort}
          onChange={(e) => setSort(e.target.value)}
        >
          {SORTS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      <div className="divide-y divide-slate-200 dark:divide-slate-800">
        {loading && !rows.length && (
          <p className="p-8 text-center text-sm text-slate-500">
            Loading templates…
          </p>
        )}
        {!loading && !rows.length && (
          <p className="p-8 text-center text-sm text-slate-500">
            {templates.length
              ? "No templates match these filters."
              : "Create your first template or sync existing templates from Meta."}
          </p>
        )}
        {rows.map((t) => (
          <article
            key={t.id}
            className="grid gap-4 p-5 lg:grid-cols-[1fr_300px]"
          >
            <div className="min-w-0 space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="truncate font-semibold">{t.name}</h3>
                  <p className="mt-1 text-xs text-slate-500">
                    {t.language} · {t.category} · header{" "}
                    {(t.header_type || "NONE").toLowerCase()} ·{" "}
                    {t.button_count
                      ? `${t.button_count} button${t.button_count > 1 ? "s" : ""}`
                      : "no buttons"}{" "}
                    {/* An API predating the builder sends neither timestamp. */}
                    {(t.updated_at || t.created_at) &&
                      ` · updated ${new Date(t.updated_at || t.created_at).toLocaleDateString()}`}
                  </p>
                </div>
                <Badge value={t.status} />
              </div>
              {t.status === "REJECTED" && (
                <div className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
                  <p className="font-semibold">Meta rejected this template.</p>
                  <p className="mt-1">
                    {t.error ||
                      "No reason was supplied. Duplicate it, revise the wording and submit the copy."}
                  </p>
                </div>
              )}
              {t.status !== "REJECTED" && t.error && (
                <p className="text-sm text-rose-600">{t.error}</p>
              )}
              {!t.supported && (
                <p className="text-sm text-amber-600">
                  Media headers can be built and submitted, but sending one
                  needs per-recipient media, which arrives with media messaging.
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                {t.status === EDITABLE && (
                  <>
                    <button
                      disabled={busy}
                      className={secondary}
                      onClick={() => setEditing(t)}
                    >
                      Edit
                    </button>
                    <button
                      disabled={busy}
                      className={button}
                      onClick={() =>
                        action(
                          () => api.submitTemplate(t.id),
                          "Template submitted. Sync to check approval.",
                        )
                      }
                    >
                      <Send size={14} />
                      Submit to Meta
                    </button>
                  </>
                )}
                <button
                  disabled={busy}
                  className={secondary}
                  title="Copy into a new editable draft"
                  onClick={() =>
                    action(
                      () => api.duplicateTemplate(t.id),
                      "Copied into a new draft you can edit.",
                    )
                  }
                >
                  <Copy size={14} />
                  Duplicate
                </button>
                <button
                  disabled={busy}
                  className={`${secondary} text-rose-600`}
                  onClick={() => {
                    const warning =
                      t.status === EDITABLE
                        ? `Delete the draft "${t.name}"?`
                        : `Delete "${t.name}" (${t.language}) from Meta as well? This cannot be undone.`;
                    if (window.confirm(warning))
                      void action(
                        () => api.deleteTemplate(t.id),
                        "Template deleted.",
                      );
                  }}
                >
                  <Trash2 size={14} />
                  Delete
                </button>
                {busy && (
                  <Loader2 size={16} className="animate-spin self-center" />
                )}
              </div>
            </div>
            <TemplatePreview draft={structureOf(t)} />
          </article>
        ))}
      </div>
    </section>
  );
}
