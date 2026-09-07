import { useRef, useState } from "react";
import { Check, Loader2, Upload } from "lucide-react";
import type {
  Account,
  HeaderFormat,
  SlotField,
  Template,
} from "@/api/whatsapp";
import { whatsappApi as api } from "@/api/whatsapp";
import { input, secondary, errorText } from "./shared";
import { Field } from "./WhatsAppUi";

const SECTIONS: Array<SlotField["section"]> = ["header", "body", "button"];
const TITLES: Record<SlotField["section"], string> = {
  header: "Header",
  body: "Body",
  button: "Button",
};
const ACCEPT: Record<string, string> = {
  IMAGE: "image/jpeg,image/png",
  VIDEO: "video/mp4,video/3gpp",
  DOCUMENT: "application/pdf",
};

/** Upload control for a media header. The file becomes a media row; the row's
 *  id is the slot value and the backend resolves it to a Meta media ID. */
export function MediaHeaderPicker({
  account,
  format,
  value,
  change,
}: {
  account: Account;
  format?: HeaderFormat;
  value: string;
  change: (v: string) => void;
}) {
  const picker = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false),
    [name, setName] = useState(""),
    [problem, setProblem] = useState("");
  return (
    <div className="space-y-2">
      <input
        ref={picker}
        type="file"
        className="hidden"
        accept={ACCEPT[format || "IMAGE"]}
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          setBusy(true);
          setProblem("");
          try {
            const media = await api.uploadMedia(account.id, file);
            change(media.id);
            setName(media.filename);
          } catch (error) {
            setProblem(errorText(error));
          } finally {
            setBusy(false);
          }
        }}
      />
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className={secondary}
          disabled={busy}
          onClick={() => picker.current?.click()}
        >
          {busy ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Upload size={14} />
          )}
          {value
            ? "Replace file"
            : `Upload ${(format || "file").toLowerCase()}`}
        </button>
        {value && !busy && (
          <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400">
            <Check size={14} />
            {name || "Ready to send"}
          </span>
        )}
      </div>
      {problem && (
        <p role="alert" className="text-xs text-rose-600">
          {problem}
        </p>
      )}
    </div>
  );
}

/** Renders exactly the inputs a template declares - no more, no fewer.
 *  A template with no slots renders a single explanatory line. */
export default function SlotInputs({
  account,
  template,
  values,
  change,
  columns,
}: {
  account: Account;
  template: Template;
  values: Record<string, string>;
  change: (slot: string, value: string) => void;
  /** When present, each text slot is chosen from these CSV columns instead of typed. */
  columns?: string[];
}) {
  const fields = template.slot_fields;
  if (!fields.length)
    return (
      <p className="rounded-xl bg-violet-50/70 p-3 text-sm text-slate-600 dark:bg-slate-950 dark:text-slate-300">
        This template does not require any variable mapping.
      </p>
    );
  return (
    <div className="space-y-4">
      {SECTIONS.map((section) => {
        const group = fields.filter((f) => f.section === section);
        if (!group.length) return null;
        return (
          <div key={section} className="space-y-3">
            <h4 className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              {TITLES[section]}
            </h4>
            {group.map((field) =>
              field.kind === "media" ? (
                <div key={field.slot}>
                  <p className="mb-1 text-sm font-medium">{field.label}</p>
                  <MediaHeaderPicker
                    account={account}
                    format={field.media_format}
                    value={values[field.slot] || ""}
                    change={(v) => change(field.slot, v)}
                  />
                </div>
              ) : (
                <Field key={field.slot} label={field.label}>
                  {columns ? (
                    <select
                      className={input}
                      value={values[field.slot] || ""}
                      onChange={(e) => change(field.slot, e.target.value)}
                    >
                      <option value="">Select a column</option>
                      {columns.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      className={input}
                      value={values[field.slot] || ""}
                      onChange={(e) => change(field.slot, e.target.value)}
                    />
                  )}
                </Field>
              ),
            )}
          </div>
        );
      })}
    </div>
  );
}
