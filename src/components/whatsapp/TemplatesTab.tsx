import { useState } from "react";
import { Loader2, RefreshCw, Send } from "lucide-react";
import type { Account, Template } from "@/api/whatsapp";
import { card, input, button, secondary, errorText } from "./shared";
import { Field, Badge, Bubble } from "./WhatsAppUi";
import { whatsappApi as api } from "@/api/whatsapp";
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
  const [editing, setEditing] = useState<string>(),
    [name, setName] = useState(""),
    [body, setBody] = useState(""),
    [language, setLanguage] = useState("en_US"),
    [category, setCategory] = useState("MARKETING");
  const [examples, setExamples] = useState<Record<string, string>>({}),
    [busy, setBusy] = useState(false);
  const keys = [
    ...new Set([...body.matchAll(/{{(\d+)}}/g)].map((m) => m[1])),
  ].sort((a, b) => Number(a) - Number(b));
  const action = async (work: () => Promise<unknown>, message: string) => {
    setBusy(true);
    try {
      await work();
      await refresh();
      notify(message);
    } catch (e) {
      notify(errorText(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
      <section className={`${card} p-5`}>
        <h2 className="text-lg font-bold">
          {editing ? "Edit template draft" : "Create template"}
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Use numbered variables such as {"{{1}}"} for student names. Meta
          reviews templates before they can be sent.
        </p>
        <form
          className="mt-5 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void action(async () => {
              await api.saveTemplate(
                {
                  account_id: account.id,
                  name,
                  body,
                  language,
                  category,
                  examples: keys.map((k) => examples[k] || ""),
                },
                editing,
              );
              setEditing(undefined);
              setName("");
              setBody("");
              setExamples({});
            }, "Template draft saved. Submit it when ready.");
          }}
        >
          <Field label="Template name">
            <input
              required
              className={input}
              placeholder="admission_reminder"
              pattern="[a-z][a-z0-9_]*"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Language code">
              <input
                required
                className={input}
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
              />
            </Field>
            <Field label="Category">
              <select
                className={input}
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="MARKETING">Marketing</option>
                <option value="UTILITY">Utility</option>
              </select>
            </Field>
          </div>
          <Field label="Message">
            <textarea
              required
              rows={5}
              maxLength={1024}
              className={input}
              placeholder="Hi {{1}}, admissions for {{2}} are now open."
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </Field>
          <p className="text-right text-xs text-slate-500">
            {body.length}/1,024 characters
          </p>
          {keys.map((k) => (
            <Field key={k} label={`Example for {{${k}}}`}>
              <input
                required
                className={input}
                value={examples[k] || ""}
                onChange={(e) =>
                  setExamples({ ...examples, [k]: e.target.value })
                }
              />
            </Field>
          ))}
          <Bubble
            body={body.replace(
              /{{(\d+)}}/g,
              (whole, key) => examples[key] || whole,
            )}
          />
          <div className="flex gap-2">
            <button disabled={busy} className={button}>
              {busy && <Loader2 size={16} className="animate-spin" />}Save draft
            </button>
            {editing && (
              <button
                type="button"
                className={secondary}
                onClick={() => {
                  setEditing(undefined);
                  setName("");
                  setBody("");
                  setExamples({});
                }}
              >
                New template
              </button>
            )}
          </div>
        </form>
      </section>
      <section className={`${card} overflow-hidden`}>
        <div className="flex items-center justify-between border-b border-slate-200 p-5 dark:border-slate-800">
          <h2 className="text-lg font-bold">Your templates</h2>
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
        </div>
        <div className="max-h-[800px] overflow-y-auto">
          {!templates.length && (
            <p className="p-8 text-center text-sm text-slate-500">
              Create your first template or sync existing templates.
            </p>
          )}
          {templates.map((t) => (
            <div
              key={t.id}
              className="space-y-3 border-b border-slate-200 p-5 dark:border-slate-800"
            >
              <div className="flex flex-wrap justify-between gap-2">
                <div>
                  <h3 className="font-semibold">{t.name}</h3>
                  <p className="text-xs text-slate-500">
                    {t.language} · {t.category}
                  </p>
                </div>
                <Badge value={t.status} />
              </div>
              <Bubble body={t.body} />
              {!t.supported && (
                <p className="text-sm text-amber-600">
                  This template includes media or dynamic components that this
                  campaign editor does not support yet.
                </p>
              )}
              {t.error && <p className="text-sm text-rose-600">{t.error}</p>}
              {t.status === "DRAFT" && (
                <div className="flex gap-2">
                  <button
                    disabled={busy}
                    className={secondary}
                    onClick={() => {
                      setEditing(t.id);
                      setName(t.name);
                      setBody(t.body);
                      setLanguage(t.language);
                      setCategory(t.category);
                      const values =
                        t.components.find((c) => c.type === "BODY")?.example
                          ?.body_text?.[0] || [];
                      setExamples(
                        Object.fromEntries(
                          t.variables.map((k, i) => [k, values[i] || ""]),
                        ),
                      );
                    }}
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
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
