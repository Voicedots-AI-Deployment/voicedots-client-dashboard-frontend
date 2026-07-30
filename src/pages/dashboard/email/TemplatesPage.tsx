import { useEffect, useState } from "react";
import { FileText, Loader2, Trash2, AlertCircle } from "lucide-react";
import communicationAPI, { type EmailTemplateSummary } from "@/api/communication";

const card =
  "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden";

export default function TemplatesPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [templates, setTemplates] = useState<EmailTemplateSummary[]>([]);

  const load = async () => {
    setLoading(true);
    try {
      setTemplates(await communicationAPI.listTemplates());
      setError("");
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Templates are unavailable right now.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

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
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Email Templates</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Manage the templates used for automated replies and campaigns.
        </p>
      </div>

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
