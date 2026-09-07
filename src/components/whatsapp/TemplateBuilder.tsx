import { useMemo, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import type {
  Account,
  ButtonType,
  HeaderFormat,
  Template,
  TemplateButton,
  TemplateStructure,
} from "@/api/whatsapp";
import { whatsappApi as api } from "@/api/whatsapp";
import { card, input, button, secondary, errorText } from "./shared";
import { Field } from "./WhatsAppUi";
import TemplatePreview from "./TemplatePreview";

import {
  BODY_MAX,
  BUTTON_LABEL,
  BUTTON_LIMITS,
  BUTTON_TEXT_MAX,
  BUTTONS_MAX,
  FOOTER_MAX,
  HEADER_TEXT_MAX,
  MEDIA_FORMATS,
  bodyKeys,
  emptyDraft,
  validate,
} from "./templateRules";

function Problem({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="mt-1 text-xs text-rose-600">
      {message}
    </p>
  );
}

export default function TemplateBuilder({
  account,
  editing,
  refresh,
  notify,
  done,
}: {
  account: Account;
  editing?: Template;
  refresh: () => Promise<void>;
  notify: (s: string) => void;
  done: () => void;
}) {
  const [name, setName] = useState(editing?.name || ""),
    [language, setLanguage] = useState(editing?.language || "en_US"),
    [category, setCategory] = useState(editing?.category || "MARKETING");
  const [draft, setDraft] = useState<TemplateStructure>(
    editing?.structure || emptyDraft(),
  );
  const [busy, setBusy] = useState(false),
    [touched, setTouched] = useState(false);
  const errors = useMemo(() => validate(name, draft), [name, draft]);
  const keys = bodyKeys(draft.body);
  const patch = (change: Partial<TemplateStructure>) =>
    setDraft((current) => ({ ...current, ...change }));
  const setButton = (index: number, change: Partial<TemplateButton>) =>
    patch({
      buttons: draft.buttons.map((b, i) =>
        i === index ? { ...b, ...change } : b,
      ),
    });
  const addButton = (type: ButtonType) =>
    patch({
      buttons: [
        ...draft.buttons,
        { type, text: "", url: "", url_example: "", phone_number: "" },
      ],
    });
  const save = async () => {
    setTouched(true);
    if (Object.keys(errors).length) return;
    setBusy(true);
    try {
      await api.saveTemplate(
        {
          account_id: account.id,
          name,
          language,
          category,
          header: draft.header,
          body: draft.body,
          examples: keys.map((k) => draft.examples[k - 1] || ""),
          footer: draft.footer,
          buttons: draft.buttons,
        },
        editing?.id,
      );
      await refresh();
      notify("Template draft saved. Submit it when ready.");
      done();
    } catch (e) {
      notify(errorText(e));
    } finally {
      setBusy(false);
    }
  };
  const show = (key: string) => (touched ? errors[key] : undefined);
  const remaining = BUTTONS_MAX - draft.buttons.length;
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      <section className={`${card} p-5`}>
        <h2 className="text-lg font-bold">
          {editing ? `Edit draft · ${editing.name}` : "Build a template"}
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Meta reviews every template before it can be sent. The preview shows
          exactly what a recipient sees.
        </p>
        <div className="mt-5 space-y-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Template name">
              <input
                className={input}
                placeholder="admission_reminder"
                value={name}
                onChange={(e) => setName(e.target.value.toLowerCase())}
              />
              <Problem message={show("name")} />
            </Field>
            <Field label="Language code">
              <input
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

          <fieldset className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
            <legend className="px-2 text-sm font-semibold">Header</legend>
            <div className="flex flex-wrap gap-2">
              {(
                ["NONE", "TEXT", "IMAGE", "VIDEO", "DOCUMENT"] as HeaderFormat[]
              ).map((format) => (
                <button
                  key={format}
                  type="button"
                  aria-pressed={draft.header.format === format}
                  onClick={() => patch({ header: { ...draft.header, format } })}
                  className={`rounded-xl px-3 py-1.5 text-xs font-semibold capitalize ${draft.header.format === format ? "bg-indigo-700 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"}`}
                >
                  {format.toLowerCase()}
                </button>
              ))}
            </div>
            {draft.header.format === "TEXT" && (
              <div className="mt-3 space-y-3">
                <Field label="Header text">
                  <input
                    className={input}
                    maxLength={HEADER_TEXT_MAX}
                    placeholder="Admission Update"
                    value={draft.header.text}
                    onChange={(e) =>
                      patch({
                        header: { ...draft.header, text: e.target.value },
                      })
                    }
                  />
                </Field>
                {/{{1}}/.test(draft.header.text) && (
                  <Field label="Example for the header {{1}}">
                    <input
                      className={input}
                      value={draft.header.example}
                      onChange={(e) =>
                        patch({
                          header: { ...draft.header, example: e.target.value },
                        })
                      }
                    />
                  </Field>
                )}
              </div>
            )}
            {MEDIA_FORMATS.includes(draft.header.format) && (
              <div className="mt-3 space-y-2">
                <Field label="Uploaded media handle">
                  <input
                    className={input}
                    placeholder="4::aW1hZ2UvcG5n::ARZ…"
                    value={draft.header.handle}
                    onChange={(e) =>
                      patch({
                        header: { ...draft.header, handle: e.target.value },
                      })
                    }
                  />
                </Field>
                <p className="text-xs text-slate-500">
                  Meta requires a Resumable Upload handle for media headers, not
                  a media ID. In-dashboard uploading arrives with media
                  messaging; paste an existing handle to use one now.
                </p>
              </div>
            )}
            <Problem message={show("header")} />
          </fieldset>

          <div>
            <Field label="Message body">
              <textarea
                rows={5}
                maxLength={BODY_MAX}
                className={input}
                placeholder="Hi {{1}}, admissions for {{2}} are now open."
                value={draft.body}
                onChange={(e) => patch({ body: e.target.value })}
              />
            </Field>
            <div className="flex items-start justify-between gap-3">
              <Problem message={show("body")} />
              <p className="ml-auto shrink-0 text-xs text-slate-500">
                {draft.body.length.toLocaleString()}/{BODY_MAX.toLocaleString()}
              </p>
            </div>
          </div>

          {keys.length > 0 && (
            <div className="rounded-2xl bg-violet-50/70 p-4 dark:bg-slate-950">
              <h3 className="text-sm font-semibold">Variable examples</h3>
              <p className="mt-1 text-xs text-slate-500">
                Meta reviews templates using these values, and the preview uses
                them too.
              </p>
              <div className="mt-3 space-y-3">
                {keys.map((k) => (
                  <div key={k}>
                    <Field label={`{{${k}}}`}>
                      <input
                        className={input}
                        placeholder={k === 1 ? "Rahul" : "Computer Science"}
                        value={draft.examples[k - 1] || ""}
                        onChange={(e) => {
                          const examples = [...draft.examples];
                          examples[k - 1] = e.target.value;
                          patch({ examples });
                        }}
                      />
                    </Field>
                    <Problem message={show(`example-${k}`)} />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <Field label="Footer (optional)">
              <input
                className={input}
                maxLength={FOOTER_MAX}
                placeholder="Thank you for choosing Sona College of Technology."
                value={draft.footer}
                onChange={(e) => patch({ footer: e.target.value })}
              />
            </Field>
            <Problem message={show("footer")} />
          </div>

          <fieldset className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
            <legend className="px-2 text-sm font-semibold">
              Buttons (optional)
            </legend>
            <div className="space-y-4">
              {draft.buttons.map((b, i) => (
                <div
                  key={i}
                  className="rounded-xl bg-slate-50 p-3 dark:bg-slate-950"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                      {BUTTON_LABEL[b.type]}
                    </span>
                    <button
                      type="button"
                      aria-label={`Remove button ${i + 1}`}
                      className="rounded p-1 text-slate-400 hover:text-rose-600"
                      onClick={() =>
                        patch({
                          buttons: draft.buttons.filter((_, j) => j !== i),
                        })
                      }
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    <Field label="Label">
                      <input
                        className={input}
                        maxLength={BUTTON_TEXT_MAX}
                        placeholder="Apply Now"
                        value={b.text}
                        onChange={(e) => setButton(i, { text: e.target.value })}
                      />
                    </Field>
                    {b.type === "URL" && (
                      <Field label="URL">
                        <input
                          className={input}
                          placeholder="https://example.com/apply/{{1}}"
                          value={b.url}
                          onChange={(e) =>
                            setButton(i, { url: e.target.value })
                          }
                        />
                      </Field>
                    )}
                    {b.type === "URL" && /{{1}}/.test(b.url) && (
                      <Field label="Example link">
                        <input
                          className={input}
                          placeholder="https://example.com/apply/12345"
                          value={b.url_example}
                          onChange={(e) =>
                            setButton(i, { url_example: e.target.value })
                          }
                        />
                      </Field>
                    )}
                    {b.type === "PHONE_NUMBER" && (
                      <Field label="Phone number">
                        <input
                          className={input}
                          placeholder="+919999999999"
                          value={b.phone_number}
                          onChange={(e) =>
                            setButton(i, { phone_number: e.target.value })
                          }
                        />
                      </Field>
                    )}
                  </div>
                  <Problem message={show(`button-${i}`)} />
                </div>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {(Object.keys(BUTTON_LIMITS) as ButtonType[]).map((kind) => {
                const used = draft.buttons.filter(
                  (b) => b.type === kind,
                ).length;
                return (
                  <button
                    key={kind}
                    type="button"
                    disabled={used >= BUTTON_LIMITS[kind] || remaining <= 0}
                    className={secondary}
                    onClick={() => addButton(kind)}
                  >
                    <Plus size={14} />
                    {BUTTON_LABEL[kind]}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-slate-500">
              WhatsApp allows up to {BUTTONS_MAX} buttons:{" "}
              {BUTTON_LIMITS.QUICK_REPLY} quick replies, {BUTTON_LIMITS.URL}{" "}
              links and {BUTTON_LIMITS.PHONE_NUMBER} phone number.
            </p>
            <Problem message={show("buttons")} />
          </fieldset>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              className={button}
              onClick={() => void save()}
            >
              {busy && <Loader2 size={16} className="animate-spin" />}
              {editing ? "Save changes" : "Save draft"}
            </button>
            <button type="button" className={secondary} onClick={done}>
              Cancel
            </button>
            {touched && Object.keys(errors).length > 0 && (
              <p role="alert" className="self-center text-xs text-rose-600">
                Fix {Object.keys(errors).length} issue
                {Object.keys(errors).length > 1 ? "s" : ""} above to save.
              </p>
            )}
          </div>
        </div>
      </section>
      <aside className="xl:sticky xl:top-4 xl:self-start">
        <div className={`${card} p-4`}>
          <TemplatePreview draft={draft} />
        </div>
      </aside>
    </div>
  );
}
