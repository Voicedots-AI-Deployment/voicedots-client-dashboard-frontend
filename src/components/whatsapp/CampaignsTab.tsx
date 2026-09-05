import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowRightLeft,
  Check,
  CheckCheck,
  Download,
  Eye,
  FileSpreadsheet,
  Loader2,
  Megaphone,
  Plus,
  Rocket,
  Send,
  Smartphone,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import type {
  Account,
  Analytics,
  Binding,
  Campaign,
  Contact,
  Preview,
  Template,
  UploadResult,
} from "@/api/whatsapp";
import { whatsappApi as api } from "@/api/whatsapp";
import {
  card,
  input,
  button,
  secondary,
  consent,
  emptyPage,
  errorText,
} from "./shared";
import { Field, Badge, Pager, TemplateSelect } from "./WhatsAppUi";
import Messages from "./MessagesTab";

const label = "text-[10px] font-medium uppercase tracking-wider text-slate-500";
const rate = (value?: number | null) => (value == null ? "—" : `${value}%`);
function SampleDownload() {
  const download = () => {
    const url = URL.createObjectURL(
      new Blob(
        [
          "name,phone,course,application_link\nStudent Name,+919999999999,MBA,https://college.example/apply\n",
        ],
        { type: "text/csv" },
      ),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "whatsapp-contacts-sample.csv";
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <button
      type="button"
      onClick={download}
      className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 dark:text-indigo-300"
    >
      <Download size={13} />
      Download sample
    </button>
  );
}
export default function Campaigns({
  account,
  templates,
  notify,
}: {
  account: Account;
  templates: Template[];
  notify: (s: string) => void;
}) {
  const [campaigns, setCampaigns] = useState(emptyPage<Campaign>()),
    [analytics, setAnalytics] = useState<Analytics>(),
    [offset, setOffset] = useState(0),
    [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState(""),
    [creating, setCreating] = useState(false),
    [name, setName] = useState(""),
    [templateId, setTemplateId] = useState(""),
    [busy, setBusy] = useState(false);
  const editor = useRef<HTMLDivElement>(null);
  const load = useCallback(async () => {
    const [list, totals] = await Promise.all([
      api.campaigns(account.id, offset, filter),
      api.analytics(account.id),
    ]);
    setCampaigns(list);
    setAnalytics(totals);
  }, [account.id, offset, filter]);
  useEffect(() => {
    let active = true;
    const refresh = async () => {
      try {
        const [list, totals] = await Promise.all([
          api.campaigns(account.id, offset, filter),
          api.analytics(account.id),
        ]);
        if (active) {
          setCampaigns(list);
          setAnalytics(totals);
        }
      } catch (e) {
        if (active) notify(errorText(e));
      }
    };
    void refresh();
    const timer = window.setInterval(refresh, 5000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [account.id, offset, filter, notify]);
  return (
    <div className="space-y-7">
      <section
        className={`${card} flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6`}
      >
        <div className="flex items-center gap-3">
          <span className="rounded-xl bg-violet-100 p-3 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
            <Megaphone size={23} />
          </span>
          <div>
            <h2 className="text-xl font-semibold tracking-tight">
              WhatsApp Campaigns
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              Send personalized template messages to your applicants and
              students.
            </p>
          </div>
        </div>
        <button
          className={button}
          onClick={() => {
            setCreating(true);
            setSelected("");
          }}
        >
          <Plus size={16} />
          New campaign
        </button>
      </section>
      <div ref={editor}>
        {creating && (
          <section className={`${card} p-6`}>
            <div className="mb-5 flex items-center justify-between">
              <h3 className="font-semibold">Set up your campaign</h3>
              <button
                aria-label="Close campaign setup"
                onClick={() => setCreating(false)}
              >
                <X size={18} />
              </button>
            </div>
            <form
              className="grid items-end gap-4 md:grid-cols-[1fr_1fr_auto]"
              onSubmit={async (e) => {
                e.preventDefault();
                setBusy(true);
                try {
                  const c = await api.saveCampaign({
                    account_id: account.id,
                    name,
                    template_id: templateId,
                    mapping: {},
                  });
                  setSelected(c.id);
                  setCreating(false);
                  setName("");
                  await load();
                } catch (error) {
                  notify(errorText(error));
                } finally {
                  setBusy(false);
                }
              }}
            >
              <Field label="Campaign name">
                <input
                  required
                  maxLength={255}
                  className={input}
                  placeholder="September exam reminder"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </Field>
              <TemplateSelect
                templates={templates}
                value={templateId}
                change={setTemplateId}
              />
              <button
                disabled={busy || !templateId || !name.trim()}
                className={button}
              >
                {busy && <Loader2 className="animate-spin" size={14} />}Create
                draft
              </button>
            </form>
            <p className="mt-4 text-xs text-slate-500">
              Choose an approved template, then add your audience and
              personalize each message.
            </p>
          </section>
        )}
        {selected && (
          <CampaignEditor
            key={selected}
            id={selected}
            account={account}
            templates={templates}
            notify={notify}
            onChange={load}
          />
        )}
      </div>
      <section className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">
              Recent campaigns & delivery analytics
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Provider-reported delivery and read receipts across your
              campaigns.
            </p>
          </div>
          <div className="flex flex-wrap gap-1 rounded-full bg-violet-100/60 p-1 dark:bg-slate-900">
            {[
              ["all", "All"],
              ["completed", "Completed"],
              ["running", "In progress"],
              ["draft", "Drafts"],
            ].map(([key, title]) => (
              <button
                key={key}
                onClick={() => {
                  setFilter(key);
                  setOffset(0);
                }}
                aria-pressed={filter === key}
                className={`rounded-full px-3 py-1.5 text-xs ${filter === key ? "bg-white font-semibold text-indigo-700 shadow-sm dark:bg-indigo-700 dark:text-white" : "text-slate-500"}`}
              >
                {title}
              </button>
            ))}
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            {
              title: "Messages sent",
              value: analytics?.sent.toLocaleString() ?? "—",
              icon: Send,
              color: "text-indigo-700",
            },
            {
              title: "Delivery rate",
              value: rate(analytics?.delivery_rate),
              icon: CheckCheck,
              color: "text-emerald-700",
            },
            {
              title: "Read rate",
              value: rate(analytics?.read_rate),
              icon: Eye,
              color: "text-indigo-700",
            },
          ].map(({ title, value, icon: Icon, color }) => (
            <div
              key={title}
              className={`${card} flex items-center justify-between p-5`}
            >
              <div>
                <p className={label}>{title}</p>
                <p
                  className={`mt-2 text-2xl font-semibold ${color} dark:text-indigo-300`}
                >
                  {value}
                </p>
              </div>
              <span className="rounded-full bg-violet-50 p-3 text-indigo-600 dark:bg-indigo-950">
                <Icon size={18} />
              </span>
            </div>
          ))}
        </div>
        <div className={`${card} overflow-hidden`}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[750px] text-left text-sm">
              <thead className="bg-violet-50/80 dark:bg-slate-950">
                <tr>
                  {[
                    "Campaign name",
                    "Template",
                    "Audience",
                    "Sent",
                    "Delivered",
                    "Read",
                    "Failed",
                    "Status",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-4 text-[10px] font-medium uppercase tracking-wider text-slate-500"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {campaigns.items.map((c) => (
                  <tr
                    key={c.id}
                    className={`border-t border-violet-50 dark:border-slate-800 ${selected === c.id ? "bg-violet-50/50 dark:bg-indigo-950/20" : ""}`}
                  >
                    <td className="max-w-[260px] px-4 py-5">
                      <button
                        className="flex items-center gap-2 text-left font-medium hover:text-indigo-600"
                        onClick={() => {
                          setSelected(c.id);
                          setCreating(false);
                          editor.current?.scrollIntoView({
                            behavior: "smooth",
                            block: "start",
                          });
                        }}
                      >
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-600" />
                        {c.name}
                      </button>
                    </td>
                    <td className="max-w-[160px] px-4 py-5">
                      <span className="break-words rounded bg-violet-50 px-1.5 py-1 text-[11px] dark:bg-indigo-950">
                        {c.template_name ||
                          templates.find((t) => t.id === c.template_id)?.name ||
                          "Template"}
                      </span>
                    </td>
                    <td className="px-4">{c.total_contacts}</td>
                    <td className="px-4">{c.sent ?? 0}</td>
                    <td className="min-w-[105px] px-4">
                      <Metric
                        count={c.delivered ?? 0}
                        percentage={c.delivery_rate}
                      />
                    </td>
                    <td className="min-w-[105px] px-4">
                      <Metric count={c.read ?? 0} percentage={c.read_rate} />
                    </td>
                    <td className="px-4 text-rose-600">{c.failed ?? 0}</td>
                    <td className="px-4">
                      <Badge value={c.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!campaigns.total && (
              <div className="p-12 text-center">
                <Megaphone className="mx-auto mb-3 text-indigo-300" size={30} />
                <p className="font-medium">
                  {filter === "all"
                    ? "Your first campaign starts here"
                    : "No campaigns in this view"}
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  Create a draft to add recipients, map your template, and
                  preview messages.
                </p>
              </div>
            )}
          </div>
          <Pager
            total={campaigns.total}
            offset={offset}
            size={30}
            change={setOffset}
          />
        </div>
        <p className="text-[11px] text-slate-400">
          Delivery rate = delivered ÷ sent. Read rate = read ÷ delivered.
          Accepted messages are awaiting a sent receipt; read receipts may be
          unavailable.
        </p>
      </section>
    </div>
  );
}
function Metric({
  count,
  percentage,
}: {
  count: number;
  percentage?: number | null;
}) {
  return (
    <div>
      <div className="mb-1.5 flex justify-between gap-2 text-xs">
        <span>{count}</span>
        <span className="text-[10px] text-slate-400">{rate(percentage)}</span>
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-violet-100 dark:bg-slate-800">
        <div
          className="h-full rounded-full bg-indigo-600"
          style={{ width: `${percentage ?? 0}%` }}
        />
      </div>
    </div>
  );
}
function CampaignEditor({
  id,
  account,
  templates,
  notify,
  onChange,
}: {
  id: string;
  account: Account;
  templates: Template[];
  notify: (s: string) => void;
  onChange: () => Promise<void>;
}) {
  const [campaign, setCampaign] = useState<Campaign>(),
    [contacts, setContacts] = useState(emptyPage<Contact>()),
    [offset, setOffset] = useState(0);
  const [name, setName] = useState(""),
    [templateId, setTemplateId] = useState(""),
    [mapping, setMapping] = useState<Record<string, Binding>>({});
  const [preview, setPreview] = useState<Preview>(),
    [result, setResult] = useState<UploadResult>(),
    [consented, setConsented] = useState(false),
    [busy, setBusy] = useState(false);
  const [file, setFile] = useState<File | null>(null),
    [filename, setFilename] = useState(""),
    [manualName, setManualName] = useState(""),
    [number, setNumber] = useState(""),
    [extra, setExtra] = useState<Record<string, string>>({});
  const audienceRef = useRef<HTMLElement>(null),
    mappingRef = useRef<HTMLElement>(null),
    previewRef = useRef<HTMLElement>(null),
    launchRef = useRef<HTMLElement>(null);
  const load = useCallback(async () => {
    const [c, rows] = await Promise.all([
      api.campaign(id),
      api.contacts(id, offset),
    ]);
    setCampaign(c);
    setContacts(rows);
  }, [id, offset]);
  useEffect(() => {
    let active = true;
    api
      .campaign(id)
      .then((c) => {
        if (active) {
          setName(c.name);
          setTemplateId(c.template_id);
          setMapping(c.mapping);
        }
      })
      .catch((e) => notify(errorText(e)));
    return () => {
      active = false;
    };
  }, [id, notify]);
  useEffect(() => {
    void load().catch((e) => notify(errorText(e)));
  }, [load, notify]);
  useEffect(() => {
    if (campaign?.status !== "running") return;
    const timer = window.setInterval(() => {
      void load().catch((e) => notify(errorText(e)));
    }, 3000);
    return () => window.clearInterval(timer);
  }, [campaign?.status, load, notify]);
  const action = async (work: () => Promise<unknown>, message?: string) => {
    setBusy(true);
    try {
      await work();
      await load();
      await onChange();
      if (message) notify(message);
    } catch (e) {
      notify(errorText(e));
    } finally {
      setBusy(false);
    }
  };
  const invalidate = () => {
    setPreview(undefined);
    setConsented(false);
  };
  const save = () =>
    api.saveCampaign(
      { account_id: account.id, name, template_id: templateId, mapping },
      id,
    );
  const template = templates.find((t) => t.id === templateId);
  const fields = [
    ...new Set([
      "name",
      "phone",
      ...(contacts.fields || []),
      ...contacts.items.flatMap((c) => Object.keys(c.extra)),
    ]),
  ];
  const manualFields = [
    ...new Set(
      Object.values(mapping)
        .filter(
          (b) =>
            b.source === "field" &&
            !["name", "contact_name", "phone"].includes(b.value),
        )
        .map((b) => b.value),
    ),
  ];
  if (!campaign)
    return (
      <section className={`${card} p-8 text-sm text-slate-500`}>
        Loading campaign…
      </section>
    );
  const draft = campaign.status === "draft";
  const mapped =
    !!template && template.variables.every((k) => mapping[k]?.value.trim());
  const step = !draft
    ? 4
    : preview && !preview.rejected_count
      ? 3
      : !campaign.total_contacts
        ? 0
        : !mapped
          ? 1
          : 2;
  const steps = [
    { name: "Audience", ref: audienceRef },
    { name: "Template & mapping", ref: mappingRef },
    { name: "Preview", ref: previewRef },
    { name: "Confirm", ref: launchRef },
    { name: "Launch", ref: launchRef },
  ];
  return (
    <div className="space-y-5">
      <nav
        aria-label="Campaign setup progress"
        className={`${card} flex items-center gap-2 overflow-x-auto px-5 py-5 sm:justify-between`}
      >
        {steps.map((s, i) => (
          <button
            key={s.name}
            onClick={() =>
              s.ref.current?.scrollIntoView({
                behavior: "smooth",
                block: "start",
              })
            }
            className="flex shrink-0 items-center gap-2 text-left"
            aria-current={step === i ? "step" : undefined}
          >
            <span
              className={`flex h-8 w-8 items-center justify-center rounded-full text-xs ${i < step ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300" : i === step ? "bg-indigo-700 text-white shadow-md" : "bg-violet-50 text-slate-400 dark:bg-slate-800"}`}
            >
              {i < step ? <Check size={14} /> : i + 1}
            </span>
            <span>
              <span className="block text-xs font-medium">{s.name}</span>
              <span
                className={`text-[9px] uppercase tracking-wider ${i === step ? "text-indigo-600 dark:text-indigo-300" : "text-slate-400"}`}
              >
                {i < step
                  ? "Complete"
                  : i === step
                    ? draft
                      ? "Current step"
                      : campaign.status
                    : "Pending"}
              </span>
            </span>
          </button>
        ))}
      </nav>
      {!draft ? (
        <section className={`${card} space-y-4 p-6`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold">{campaign.name}</h3>
              <p className="mt-1 text-sm text-slate-500">
                {campaign.total_contacts} recipients ·{" "}
                {campaign.progress_percent}% processed
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge value={campaign.status} />
              <button
                className={secondary}
                onClick={() => action(() => api.report(id))}
              >
                <Download size={14} />
                Download report
              </button>
              {campaign.status === "running" && (
                <button
                  disabled={busy}
                  className={secondary}
                  onClick={() => {
                    if (
                      window.confirm(
                        "Cancel remaining unsent messages? Messages already submitted cannot be recalled.",
                      )
                    )
                      void action(
                        () => api.cancel(id),
                        "Remaining messages cancelled.",
                      );
                  }}
                >
                  Cancel campaign
                </button>
              )}
            </div>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-violet-100 dark:bg-slate-800">
            <div
              className="h-full rounded-full bg-indigo-700"
              style={{ width: `${campaign.progress_percent}%` }}
            />
          </div>
          <div className="flex flex-wrap gap-3">
            {Object.entries(campaign.counts).map(([s, n]) => (
              <span key={s} className="text-xs">
                <Badge value={s} /> {n}
              </span>
            ))}
          </div>
          <p className="text-xs text-slate-400">
            Submission progress is separate from delivery. Receipts continue
            updating after the campaign finishes.
          </p>
        </section>
      ) : (
        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(300px,0.9fr)]">
          <div className="min-w-0 space-y-5">
            <section
              ref={audienceRef}
              className={`${card} scroll-mt-24 space-y-5 p-5 sm:p-6`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="rounded-lg bg-violet-50 p-2 text-indigo-600 dark:bg-indigo-950">
                    <FileSpreadsheet size={20} />
                  </span>
                  <div>
                    <p className={label}>
                      {result ? "Latest import" : "Campaign audience"}
                    </p>
                    <p className="mt-1 max-w-[260px] truncate text-sm font-medium">
                      {filename || "Add your recipient list"}
                    </p>
                  </div>
                </div>
                <SampleDownload />
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[
                  {
                    title: result ? "Rows reviewed" : "Saved audience",
                    value: result?.total_rows ?? campaign.total_contacts,
                    tone: "bg-violet-50 dark:bg-slate-800",
                  },
                  {
                    title: result ? "Accepted" : "Recipients",
                    value: result?.accepted ?? campaign.total_contacts,
                    tone: "bg-indigo-100/80 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300",
                  },
                  {
                    title: "Rejected",
                    value: result?.invalid_count ?? "—",
                    tone: result?.invalid_count
                      ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                      : "bg-violet-50 dark:bg-slate-800",
                  },
                  {
                    title: "Duplicates",
                    value: result?.duplicate_count ?? "—",
                    tone: "bg-violet-50 dark:bg-slate-800",
                  },
                ].map((stat) => (
                  <div
                    key={stat.title}
                    className={`rounded-lg p-3 ${stat.tone}`}
                  >
                    <p className="text-[9px] uppercase tracking-wider">
                      {stat.title}
                    </p>
                    <p className="mt-2 text-xl font-semibold">{stat.value}</p>
                  </div>
                ))}
              </div>
              <div className="rounded-xl border border-dashed border-indigo-200 bg-violet-50/30 p-4 dark:border-slate-700 dark:bg-slate-950/40">
                <Field label="Upload CSV or Excel">
                  <input
                    type="file"
                    accept=".csv,.xlsx"
                    className={`${input} text-xs`}
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                  />
                </Field>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                  <p className="max-w-[240px] text-[11px] leading-relaxed text-slate-500">
                    Include name and phone columns. Up to 5 MB / 5,000 contacts.
                  </p>
                  <button
                    disabled={busy || !file}
                    className={secondary}
                    onClick={() =>
                      action(async () => {
                        const r = await api.upload(id, file!);
                        setResult(r);
                        setFilename(file!.name);
                        invalidate();
                      })
                    }
                  >
                    <Upload size={14} />
                    Upload & validate
                  </button>
                </div>
              </div>
              <details className="rounded-xl border border-violet-100 p-4 dark:border-slate-800">
                <summary className="cursor-pointer text-sm font-medium">
                  Add a recipient manually
                </summary>
                <form
                  className="mt-4 space-y-3"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void action(async () => {
                      setResult(
                        await api.addContacts(id, [
                          {
                            contact_name: manualName,
                            destination: number,
                            extra,
                          },
                        ]),
                      );
                      setFilename("Manual recipient entry");
                      setNumber("");
                      setManualName("");
                      setExtra({});
                      invalidate();
                    });
                  }}
                >
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Student name">
                      <input
                        className={input}
                        value={manualName}
                        onChange={(e) => setManualName(e.target.value)}
                      />
                    </Field>
                    <Field label="WhatsApp number">
                      <input
                        required
                        type="tel"
                        className={input}
                        placeholder="+91…"
                        value={number}
                        onChange={(e) => setNumber(e.target.value)}
                      />
                    </Field>
                    {manualFields.map((f) => (
                      <Field key={f} label={f}>
                        <input
                          className={input}
                          value={extra[f] || ""}
                          onChange={(e) =>
                            setExtra({ ...extra, [f]: e.target.value })
                          }
                        />
                      </Field>
                    ))}
                  </div>
                  <button className={secondary} disabled={busy || !number}>
                    <Plus size={14} />
                    Add recipient
                  </button>
                </form>
              </details>
              {result && (
                <div role="status" className="text-xs text-slate-500">
                  {result.accepted} added · {result.rejected_count} rejected
                  {result.rejected.length > 0 && (
                    <ul className="mt-2 max-h-32 space-y-1 overflow-y-auto text-rose-600">
                      {result.rejected.map((r, i) => (
                        <li key={i}>
                          Row {r.row}: {r.reason}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
              <details>
                <summary className="cursor-pointer text-xs font-medium text-indigo-600 dark:text-indigo-300">
                  Review {campaign.total_contacts} saved recipients
                </summary>
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr>
                        <th className="p-2 font-medium text-slate-500">Name</th>
                        <th className="p-2 font-medium text-slate-500">
                          Number
                        </th>
                        <th>
                          <span className="sr-only">Remove</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {contacts.items.map((c) => (
                        <tr
                          key={c.id}
                          className="border-t border-violet-50 dark:border-slate-800"
                        >
                          <td className="p-2">{c.contact_name || "—"}</td>
                          <td className="p-2">{c.destination}</td>
                          <td className="p-2">
                            <button
                              aria-label={`Remove ${c.contact_name || c.destination}`}
                              disabled={busy}
                              onClick={() =>
                                action(async () => {
                                  await api.removeContact(id, c.id);
                                  invalidate();
                                })
                              }
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Pager
                  offset={offset}
                  total={contacts.total}
                  change={setOffset}
                />
              </details>
              <p className="text-[10px] text-slate-400">
                Use country codes for international numbers. Bare 10-digit
                numbers use +91.
              </p>
            </section>
            <section
              ref={mappingRef}
              className={`${card} scroll-mt-24 space-y-5 p-5 sm:p-6`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="rounded-full bg-violet-100 px-2 py-1 text-[10px] text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                  {template?.category || "TEMPLATE"}
                </span>
                {template && <Badge value={template.status} />}
              </div>
              <TemplateSelect
                templates={templates}
                value={templateId}
                change={(v) => {
                  setTemplateId(v);
                  setMapping({});
                  invalidate();
                }}
              />
              <div className="rounded-xl bg-violet-50 p-4 dark:bg-slate-950">
                <p className={label}>Template message</p>
                <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                  {template?.body || "Select a template to begin."}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-semibold">Data association</h3>
                <p className="mt-1 text-xs text-slate-500">
                  Match each variable to a contact field or a fixed value.
                </p>
              </div>
              {template?.variables.map((k) => (
                <div
                  key={k}
                  className="grid items-center gap-2 rounded-xl bg-violet-50/70 p-3 sm:grid-cols-[80px_20px_1fr] dark:bg-slate-950"
                >
                  <code className="break-all text-xs text-indigo-700 dark:text-indigo-300">{`{{${k}}}`}</code>
                  <ArrowRightLeft
                    size={13}
                    className="hidden text-slate-400 sm:block"
                  />
                  <div className="grid min-w-0 grid-cols-[105px_1fr] gap-2">
                    <select
                      aria-label={`Source for variable ${k}`}
                      className={`${input} !mt-0 !px-2 !py-2 text-xs`}
                      value={mapping[k]?.source || "field"}
                      onChange={(e) => {
                        setMapping({
                          ...mapping,
                          [k]: {
                            source: e.target.value as "field" | "fixed",
                            value: "",
                          },
                        });
                        invalidate();
                      }}
                    >
                      <option value="field">Contact field</option>
                      <option value="fixed">Fixed value</option>
                    </select>
                    <input
                      aria-label={`Value for variable ${k}`}
                      list={`columns-${id}`}
                      className={`${input} !mt-0 min-w-0 !px-2 !py-2 text-xs`}
                      placeholder={
                        mapping[k]?.source === "fixed"
                          ? "Enter value"
                          : "Column name"
                      }
                      value={mapping[k]?.value || ""}
                      onChange={(e) => {
                        setMapping({
                          ...mapping,
                          [k]: {
                            source: mapping[k]?.source || "field",
                            value: e.target.value,
                          },
                        });
                        invalidate();
                      }}
                    />
                  </div>
                </div>
              ))}
              {template && !template.variables.length && (
                <p className="text-xs text-slate-500">
                  This template has no variables to map.
                </p>
              )}
              <datalist id={`columns-${id}`}>
                {fields.map((f) => (
                  <option key={f} value={f} />
                ))}
              </datalist>
              <div className="flex flex-wrap gap-2">
                <button
                  disabled={busy || !templateId || !mapped}
                  className={secondary}
                  onClick={() => action(save, "Draft settings saved.")}
                >
                  Save mapping
                </button>
                <button
                  disabled={busy || !campaign.total_contacts || !mapped}
                  className={button}
                  onClick={() =>
                    action(async () => {
                      await save();
                      setPreview(await api.preview(id));
                    })
                  }
                >
                  {busy ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <Eye size={15} />
                  )}
                  Validate & preview
                </button>
              </div>
            </section>
          </div>
          <div className="min-w-0 space-y-5">
            <section
              ref={previewRef}
              className={`${card} scroll-mt-24 p-5 sm:p-6`}
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="flex items-center gap-2 text-sm font-semibold">
                  <Smartphone size={17} className="text-emerald-600" />
                  Recipient previews
                </h3>
                <span className="rounded-full bg-violet-50 px-2 py-1 text-[9px] text-slate-500 dark:bg-slate-800">
                  {preview
                    ? `${preview.previews.length} of ${preview.total}`
                    : "Awaiting validation"}
                </span>
              </div>
              {preview ? (
                <>
                  <div className="mt-4 max-h-[600px] space-y-3 overflow-y-auto">
                    {preview.previews.map((p) => (
                      <article
                        key={p.destination}
                        className="rounded-xl bg-slate-50 p-3 dark:bg-slate-950"
                      >
                        <div className="mb-3 flex items-center justify-between gap-2">
                          <span className="truncate text-xs font-medium">
                            {p.contact_name || "Recipient"}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {p.destination}
                          </span>
                        </div>
                        <p className="whitespace-pre-wrap break-words rounded-lg bg-white p-3 text-xs leading-relaxed text-slate-600 dark:bg-slate-800 dark:text-slate-200">
                          {p.body}
                        </p>
                        <p className="mt-2 text-right text-[9px] text-slate-400">
                          Preview · not sent
                        </p>
                      </article>
                    ))}
                  </div>
                  <p className="mt-4 text-[11px] text-slate-500">
                    All {preview.total} recipients validated. Showing up to 10
                    previews.
                  </p>
                  {preview.rejected_count > 0 && (
                    <div
                      role="alert"
                      className="mt-4 rounded-xl bg-rose-50 p-3 text-xs text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                    >
                      <strong>
                        {preview.rejected_count} recipients need attention
                      </strong>
                      <ul className="mt-2 max-h-40 space-y-1 overflow-auto">
                        {preview.rejected.map((r) => (
                          <li key={r.destination}>
                            {r.destination}: {r.reason}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              ) : (
                <div className="py-12 text-center">
                  <Smartphone
                    size={30}
                    className="mx-auto mb-3 text-indigo-200"
                  />
                  <p className="text-sm font-medium">
                    See exactly what you’ll send
                  </p>
                  <p className="mx-auto mt-2 max-w-[220px] text-xs leading-relaxed text-slate-400">
                    Add recipients and map your variables, then validate to
                    generate personalized previews.
                  </p>
                </div>
              )}
            </section>
            <section
              ref={launchRef}
              className={`${card} scroll-mt-24 space-y-5 p-5 sm:p-6`}
            >
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <Rocket size={18} className="text-indigo-600" />
                Campaign confirmation
              </h3>
              <Field label="Campaign name">
                <input
                  className={input}
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    invalidate();
                  }}
                />
              </Field>
              <dl className="space-y-3 rounded-xl bg-violet-50 p-4 text-xs dark:bg-slate-950">
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Saved recipients</dt>
                  <dd className="font-semibold">{campaign.total_contacts}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Ready to send</dt>
                  <dd className="font-semibold text-indigo-700 dark:text-indigo-300">
                    {preview ? preview.valid : "Validate first"}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Sending method</dt>
                  <dd>Queued delivery</dd>
                </div>
              </dl>
              <label className="flex items-start gap-2.5 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                <input
                  type="checkbox"
                  className="mt-0.5 shrink-0"
                  checked={consented}
                  onChange={(e) => setConsented(e.target.checked)}
                />
                {consent}
              </label>
              <button
                className={`${button} w-full`}
                disabled={
                  busy ||
                  !account.ready ||
                  !consented ||
                  !preview?.valid ||
                  !!preview.rejected_count
                }
                onClick={() =>
                  action(
                    () => api.start(id, consent),
                    "Campaign queued for sending.",
                  )
                }
              >
                <Send size={15} />
                Send campaign
                {preview?.valid ? ` (${preview.valid} recipients)` : ""}
              </button>
              <p className="text-[10px] leading-relaxed text-slate-400">
                Messages use your connected sender. Provider limits apply;
                delivery is tracked after submission.
              </p>
            </section>
          </div>
        </div>
      )}
      {!draft && (
        <Messages
          accountId={account.id}
          campaignId={id}
          account={account}
          templates={templates}
        />
      )}
    </div>
  );
}
