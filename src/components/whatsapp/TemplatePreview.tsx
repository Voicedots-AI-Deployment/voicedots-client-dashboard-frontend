import {
  CheckCheck,
  CornerUpLeft,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Phone,
  Video,
} from "lucide-react";
import type { TemplateStructure } from "@/api/whatsapp";
import { fill } from "./templateRules";

const MEDIA = {
  IMAGE: { icon: ImageIcon, label: "Image header" },
  VIDEO: { icon: Video, label: "Video header" },
  DOCUMENT: { icon: FileText, label: "Document header" },
} as const;

function MediaBlock({ format }: { format: "IMAGE" | "VIDEO" | "DOCUMENT" }) {
  const { icon: Icon, label } = MEDIA[format];
  return (
    <div className="mb-2 flex h-32 flex-col items-center justify-center gap-2 rounded-xl bg-slate-100 text-slate-400 dark:bg-slate-700/60">
      <Icon size={26} />
      <span className="text-[11px] font-medium">{label}</span>
    </div>
  );
}

const BUTTON_ICON = {
  QUICK_REPLY: CornerUpLeft,
  URL: ExternalLink,
  PHONE_NUMBER: Phone,
} as const;

/** Real-time WhatsApp-style rendering of the template being edited. */
export default function TemplatePreview({
  draft,
}: {
  draft: TemplateStructure;
}) {
  const { header, body, examples, footer, buttons } = draft;
  const headerText =
    header.format === "TEXT" ? fill(header.text, [header.example]) : "";
  const time = new Date().toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
  return (
    <div className="rounded-2xl bg-[#f6f4ff] p-4 dark:bg-slate-950/60">
      <p className="mb-3 text-center text-[10px] font-medium uppercase tracking-wider text-slate-400">
        Preview
      </p>
      <div className="mx-auto max-w-[340px]">
        <div className="overflow-hidden rounded-2xl rounded-tl-sm bg-white text-slate-800 shadow-sm dark:bg-slate-800 dark:text-slate-100">
          <div className="p-3">
            {header.format !== "NONE" && header.format !== "TEXT" && (
              <MediaBlock format={header.format} />
            )}
            {headerText && (
              <p className="mb-1.5 break-words text-sm font-bold leading-snug">
                {headerText}
              </p>
            )}
            <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
              {fill(body, examples) || (
                <span className="text-slate-400">
                  Your message will appear here as you type.
                </span>
              )}
            </p>
            {footer && (
              <p className="mt-2 break-words text-[11px] leading-snug text-slate-400">
                {footer}
              </p>
            )}
            <div className="mt-1.5 flex items-center justify-end gap-1 text-[10px] text-slate-400">
              <time>{time}</time>
              <CheckCheck size={13} className="text-sky-500" />
            </div>
          </div>
          {buttons.length > 0 && (
            <div className="border-t border-slate-100 dark:border-slate-700">
              {buttons.map((b, i) => {
                const Icon = BUTTON_ICON[b.type];
                return (
                  <div
                    key={`${b.type}-${i}`}
                    className="flex items-center justify-center gap-2 border-b border-slate-100 py-2.5 text-sm font-medium text-sky-600 last:border-b-0 dark:border-slate-700 dark:text-sky-400"
                  >
                    <Icon size={14} />
                    <span className="truncate">{b.text || "Button"}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
