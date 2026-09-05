import type { ReactNode } from "react";
import type { Template } from "@/api/whatsapp";
import { input, secondary } from "./shared";
export function Badge({ value }: { value: string }) {
  const good = [
    "APPROVED",
    "delivered",
    "read",
    "completed",
    "received",
  ].includes(value);
  const bad = ["REJECTED", "failed", "blocked", "UNKNOWN", "unknown"].includes(
    value,
  );
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${good ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" : bad ? "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`}
    >
      {value.replaceAll("_", " ")}
    </span>
  );
}
export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block text-sm font-medium">
      {label}
      {children}
    </label>
  );
}
export function Pager({
  offset,
  total,
  size = 50,
  change,
}: {
  offset: number;
  total: number;
  size?: number;
  change: (n: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-slate-200 p-4 text-sm dark:border-slate-800">
      <span className="text-slate-500">
        {total
          ? `${offset + 1}–${Math.min(offset + size, total)} of ${total}`
          : "No results"}
      </span>
      <div className="flex gap-2">
        <button
          className={secondary}
          disabled={!offset}
          onClick={() => change(Math.max(0, offset - size))}
        >
          Previous
        </button>
        <button
          className={secondary}
          disabled={offset + size >= total}
          onClick={() => change(offset + size)}
        >
          Next
        </button>
      </div>
    </div>
  );
}
export function Bubble({
  body,
  inbound = false,
}: {
  body: string;
  inbound?: boolean;
}) {
  return (
    <div
      className={`whitespace-pre-wrap break-words rounded-2xl p-4 text-sm leading-relaxed ${inbound ? "bg-slate-100 dark:bg-slate-800" : "bg-emerald-50 text-slate-800 dark:bg-emerald-950/30 dark:text-slate-100"}`}
    >
      {body || "Your message preview will appear here."}
    </div>
  );
}
export function TemplateSelect({
  templates,
  value,
  change,
}: {
  templates: Template[];
  value: string;
  change: (s: string) => void;
}) {
  return (
    <Field label="Approved template">
      <select
        className={input}
        value={value}
        onChange={(e) => change(e.target.value)}
      >
        <option value="">Select a template</option>
        {templates
          .filter((t) => t.status === "APPROVED" && t.supported)
          .map((t) => (
            <option key={t.id} value={t.id}>
              {t.name} · {t.language}
            </option>
          ))}
      </select>
    </Field>
  );
}
