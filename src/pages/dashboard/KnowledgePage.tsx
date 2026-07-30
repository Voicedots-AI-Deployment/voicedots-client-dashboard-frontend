import { useEffect, useState } from "react";
import {
  BookOpen, Loader2, Save, RotateCcw, AlertCircle, CheckCircle2,
  FileText, Eye, Pencil, History,
} from "lucide-react";
import knowledgeAPI, {
  type KnowledgeDocument, type DocumentVersion,
} from "@/api/knowledge";

type Tab = "view" | "edit" | "history";

const panel =
  "bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800";
const tabBase =
  "px-4 py-2 text-sm font-semibold rounded-xl transition-colors flex items-center gap-2";

function bytes(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k chars` : `${n} chars`;
}

function pretty(filename: string) {
  return filename
    .replace(/\.[^.]+$/, "")
    .replace(/^[a-z0-9]+_/i, "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function KnowledgePage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("view");

  const [content, setContent] = useState("");
  const [draft, setDraft] = useState("");
  const [loadingDoc, setLoadingDoc] = useState(false);
  const [saving, setSaving] = useState(false);
  const [versions, setVersions] = useState<DocumentVersion[]>([]);

  const dirty = draft !== content;

  const loadList = async () => {
    setLoading(true);
    try {
      const res = await knowledgeAPI.listDocuments();
      setDocuments(res.documents);
      setError("");
      if (res.documents.length && !selected) setSelected(res.documents[0].filename);
    } catch (e: any) {
      setError(
        e?.response?.status === 404
          ? "No knowledge base is set up for this account yet."
          : e?.response?.data?.detail || "Could not load the knowledge base."
      );
    } finally {
      setLoading(false);
    }
  };

  const openDocument = async (filename: string) => {
    setLoadingDoc(true);
    setNotice("");
    try {
      const doc = await knowledgeAPI.getDocument(filename);
      setContent(doc.content);
      setDraft(doc.content);
      setError("");
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Could not open that document.");
    } finally {
      setLoadingDoc(false);
    }
  };

  useEffect(() => { loadList(); }, []);
  useEffect(() => { if (selected) openDocument(selected); }, [selected]);
  useEffect(() => {
    if (tab === "history" && selected) {
      knowledgeAPI.listVersions(selected).then(setVersions).catch(() => setVersions([]));
    }
  }, [tab, selected]);

  const save = async () => {
    if (!selected || !dirty) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const res = await knowledgeAPI.saveDocument(selected, draft);
      setContent(draft);
      setNotice(res.note || "Saved.");
      loadList();
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Could not save. Your changes are still here.");
    } finally {
      setSaving(false);
    }
  };

  const restore = async (versionId: string) => {
    if (!selected) return;
    setSaving(true);
    try {
      await knowledgeAPI.restoreVersion(selected, versionId);
      await openDocument(selected);
      setNotice("Previous version restored.");
      setTab("view");
      loadList();
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Could not restore that version.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-500 dark:text-slate-400">
        <Loader2 className="animate-spin mr-2" size={18} /> Loading knowledge base…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Knowledge Base</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          This is what your assistant knows. Edit a document and save — the assistant
          starts using it within a couple of minutes.
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-2xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          <AlertCircle size={16} className="mt-0.5 shrink-0" /> {error}
        </div>
      )}
      {notice && (
        <div className="flex items-start gap-2 rounded-2xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-900/20 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
          <CheckCircle2 size={16} className="mt-0.5 shrink-0" /> {notice}
        </div>
      )}

      {documents.length === 0 && !error ? (
        <section className={`${panel} p-12 text-center`}>
          <BookOpen className="mx-auto text-slate-300 dark:text-slate-600" size={32} />
          <p className="mt-4 text-base font-semibold text-slate-800 dark:text-slate-200">No documents yet</p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Your knowledge base is empty. Send your content to the VoiceDots team to get started.
          </p>
        </section>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">
          {/* Documents */}
          <aside className={`${panel} p-3 h-fit`}>
            <p className="px-2 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
              Documents
            </p>
            <ul className="space-y-1">
              {documents.map((d) => {
                const active = d.filename === selected;
                return (
                  <li key={d.filename}>
                    <button
                      onClick={() => { setSelected(d.filename); setTab("view"); }}
                      className={`w-full text-left px-3 py-2.5 rounded-xl transition-colors ${
                        active
                          ? "bg-indigo-600 text-white"
                          : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/[0.04] hover:text-slate-900 dark:hover:text-slate-200"
                      }`}
                    >
                      <span className="flex items-center gap-2 text-sm font-semibold">
                        <FileText size={14} /> {pretty(d.filename)}
                      </span>
                      <span className={`block text-[11px] mt-0.5 ${active ? "text-white/70" : "text-slate-400 dark:text-slate-500"}`}>
                        {bytes(d.characters)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </aside>

          {/* Document */}
          <section className={panel}>
            <div className="px-5 py-4 border-b border-slate-200 dark:border-white/5 flex flex-wrap items-center gap-2 justify-between">
              <div className="flex gap-1">
                {([["view", Eye, "Current"], ["edit", Pencil, "Edit"], ["history", History, "History"]] as const)
                  .map(([id, Icon, label]) => (
                    <button
                      key={id}
                      onClick={() => setTab(id as Tab)}
                      className={`${tabBase} ${
                        tab === id
                          ? "bg-slate-100 dark:bg-white/[0.06] text-slate-900 dark:text-white"
                          : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                      }`}
                    >
                      <Icon size={14} /> {label}
                    </button>
                  ))}
              </div>

              {tab === "edit" && (
                <div className="flex items-center gap-2">
                  {dirty && (
                    <button
                      onClick={() => setDraft(content)}
                      className="px-3 py-2 text-xs font-semibold rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 flex items-center gap-1.5"
                    >
                      <RotateCcw size={13} /> Discard
                    </button>
                  )}
                  <button
                    onClick={save}
                    disabled={!dirty || saving}
                    className="px-5 py-2 text-sm font-bold rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                    Save
                  </button>
                </div>
              )}
            </div>

            <div className="p-5">
              {loadingDoc ? (
                <div className="flex items-center justify-center py-16 text-slate-500 dark:text-slate-400">
                  <Loader2 className="animate-spin mr-2" size={18} /> Loading…
                </div>
              ) : tab === "view" ? (
                <pre className="whitespace-pre-wrap break-words text-[13px] leading-relaxed text-slate-700 dark:text-slate-300 font-mono max-h-[60vh] overflow-y-auto">
                  {content}
                </pre>
              ) : tab === "edit" ? (
                <>
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    spellCheck={false}
                    className="w-full h-[58vh] rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 focus:ring-2 focus:ring-indigo-400/50 outline-none p-4 text-[13px] leading-relaxed text-slate-800 dark:text-slate-200 font-mono resize-none"
                  />
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-500">
                    {bytes(draft.length)}
                    {dirty && <span className="text-amber-400"> · unsaved changes</span>}
                  </p>
                </>
              ) : (
                <div>
                  {versions.length === 0 ? (
                    <p className="text-sm text-slate-500 dark:text-slate-400 py-8 text-center">
                      No previous versions yet. A copy is kept each time you save.
                    </p>
                  ) : (
                    <ul className="divide-y divide-slate-100 dark:divide-white/5">
                      {versions.map((v) => (
                        <li key={v.id} className="py-3 flex items-center justify-between gap-4">
                          <div>
                            <p className="text-sm text-slate-800 dark:text-slate-200">
                              {new Date(v.saved_at).toLocaleString()}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-500">{bytes(v.characters)}</p>
                          </div>
                          <button
                            onClick={() => restore(v.id)}
                            disabled={saving}
                            className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/[0.05] disabled:opacity-50"
                          >
                            Restore
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
