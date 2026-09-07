import type { Page } from "@/api/whatsapp";
export const card =
  "rounded-[24px] border border-violet-100/60 bg-white dark:border-slate-800 dark:bg-slate-900";
export const input =
  "mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100";
export const button =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-50";
export const secondary =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:hover:bg-slate-800";
export const consent =
  "I confirm these recipients opted in to receive WhatsApp messages from this college.";
export const emptyPage = <T>(): Page<T> => ({ items: [], total: 0 });
export function errorText(error: unknown) {
  const detail = (error as { response?: { data?: { detail?: unknown } } })
    ?.response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail))
    return detail.map((d: { msg?: string }) => d.msg).join(". ");
  if (detail && typeof detail === "object" && "message" in detail)
    return String(detail.message);
  return "Unable to complete this action. Please try again.";
}

/** Human file size for attachment tiles and upload previews. */
export function readableSize(bytes: number) {
  if (!bytes) return "";
  const units = ["B", "KB", "MB"];
  let value = bytes,
    unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value >= 10 || unit === 0 ? Math.round(value) : value.toFixed(1)} ${units[unit]}`;
}
