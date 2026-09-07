import { useEffect, useRef, useState } from "react";
import {
  FileText,
  Image as ImageIcon,
  Loader2,
  Mic,
  Paperclip,
  Send,
  Square,
  Trash2,
  X,
} from "lucide-react";
import type { Account, MediaKind, Thread } from "@/api/whatsapp";
import { whatsappApi as api } from "@/api/whatsapp";
import { errorText, readableSize, secondary } from "./shared";

/** The attachment menu is data, not markup, so video/location/contact can be
 *  added later by extending this list rather than rewriting the composer. */
type Attachment = {
  id: MediaKind;
  label: string;
  icon: typeof ImageIcon;
  accept: string;
};
const ATTACHMENTS: Attachment[] = [
  {
    id: "image",
    label: "Image",
    icon: ImageIcon,
    accept: "image/jpeg,image/png",
  },
  {
    id: "document",
    label: "Document",
    icon: FileText,
    accept:
      ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.csv,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,text/plain,text/csv",
  },
];

/** Mirrors Meta's limits so an oversized file never leaves the browser. */
const LIMITS: Partial<Record<MediaKind, number>> = {
  image: 5 * 1024 * 1024,
  document: 100 * 1024 * 1024,
  audio: 16 * 1024 * 1024,
};

type Phase = "idle" | "uploading" | "processing" | "sending" | "failed";

type Staged = {
  file: File;
  kind: MediaKind;
  preview: string;
  caption: string;
};

const PHASE_LABEL: Record<Phase, string> = {
  idle: "",
  uploading: "Uploading…",
  processing: "Processing…",
  sending: "Sending…",
  failed: "Failed",
};

export default function Composer({
  account,
  thread,
  notify,
  sent,
}: {
  account: Account;
  thread: Thread;
  notify: (s: string) => void;
  sent: () => void;
}) {
  const [body, setBody] = useState(""),
    [busy, setBusy] = useState(false),
    [menu, setMenu] = useState(false);
  const [staged, setStaged] = useState<Staged | null>(null),
    [phase, setPhase] = useState<Phase>("idle"),
    [percent, setPercent] = useState(0),
    [problem, setProblem] = useState("");
  const [recording, setRecording] = useState(false),
    [seconds, setSeconds] = useState(0);
  const picker = useRef<HTMLInputElement>(null);
  const picking = useRef<Attachment | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const textAttempt = useRef({ body: "", key: "" });
  // Reused across retries so a timeout cannot deliver the same file twice.
  const mediaKey = useRef("");

  useEffect(
    () => () => {
      if (staged?.preview) URL.revokeObjectURL(staged.preview);
      recorder.current?.stream.getTracks().forEach((t) => t.stop());
    },
    [staged],
  );
  useEffect(() => {
    if (!recording) return;
    const timer = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(timer);
  }, [recording]);

  const stage = (file: File, kind: MediaKind) => {
    const limit = LIMITS[kind];
    if (limit && file.size > limit) {
      notify(
        `${kind === "image" ? "Images" : kind === "audio" ? "Voice messages" : "Documents"} must be ${Math.round(limit / 1024 / 1024)} MB or smaller.`,
      );
      return;
    }
    mediaKey.current = crypto.randomUUID();
    setProblem("");
    setPhase("idle");
    setPercent(0);
    setStaged({
      file,
      kind,
      preview:
        kind === "image" || kind === "audio" ? URL.createObjectURL(file) : "",
      caption: "",
    });
  };

  const discard = () => {
    if (staged?.preview) URL.revokeObjectURL(staged.preview);
    setStaged(null);
    setPhase("idle");
    setProblem("");
    setPercent(0);
  };

  const sendAttachment = async () => {
    if (!staged) return;
    setProblem("");
    try {
      setPhase("uploading");
      setPercent(0);
      const media = await api.uploadMedia(
        account.id,
        staged.file,
        staged.kind,
        setPercent,
      );
      setPhase("sending");
      await api.sendMedia({
        account_id: account.id,
        media_id: media.id,
        destination: thread.destination,
        contact_name: thread.contact_name,
        caption: staged.caption,
        idempotency_key: mediaKey.current,
      });
      discard();
      notify("Attachment queued.");
      sent();
    } catch (e) {
      setPhase("failed");
      setProblem(errorText(e));
    }
  };

  const startRecording = async () => {
    if (
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === "undefined"
    ) {
      notify("This browser cannot record audio. Attach an audio file instead.");
      return;
    }
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      notify(
        "Microphone access was blocked. Allow it in your browser settings to record a voice message.",
      );
      return;
    }
    const chunks: BlobPart[] = [];
    const media = new MediaRecorder(stream);
    media.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    media.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      const type = media.mimeType || "audio/webm";
      const blob = new Blob(chunks, { type });
      setRecording(false);
      if (blob.size)
        stage(
          new File(
            [blob],
            `voice-${Date.now()}.${type.includes("mp4") ? "m4a" : "webm"}`,
            {
              type,
            },
          ),
          "audio",
        );
    };
    // A failure here (device unplugged mid-recording) must not leave the UI stuck.
    media.onerror = () => {
      stream.getTracks().forEach((t) => t.stop());
      setRecording(false);
      notify("Recording stopped unexpectedly. Please try again.");
    };
    recorder.current = media;
    setSeconds(0);
    setRecording(true);
    media.start();
  };

  const stopRecording = () => recorder.current?.stop();

  const sendText = async () => {
    const text = body.trim();
    if (!text || busy) return;
    setBusy(true);
    if (textAttempt.current.body !== text)
      textAttempt.current = { body: text, key: crypto.randomUUID() };
    try {
      await api.reply({
        account_id: account.id,
        destination: thread.destination,
        contact_name: thread.contact_name,
        body: text,
        idempotency_key: textAttempt.current.key,
      });
      setBody("");
      textAttempt.current = { body: "", key: "" };
      notify("Reply queued.");
      sent();
    } catch (error) {
      notify(errorText(error));
    } finally {
      setBusy(false);
    }
  };

  const working =
    phase === "uploading" || phase === "processing" || phase === "sending";

  if (staged)
    return (
      <div className="space-y-3 rounded-2xl border border-violet-100 p-3 dark:border-slate-800">
        <div className="flex items-start gap-3">
          {staged.kind === "image" && staged.preview && (
            <img
              src={staged.preview}
              alt="Attachment preview"
              className="h-20 w-20 shrink-0 rounded-xl object-cover"
            />
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{staged.file.name}</p>
            <p className="mt-0.5 text-xs text-slate-500">
              {readableSize(staged.file.size)}
              {phase !== "idle" && ` · ${PHASE_LABEL[phase]}`}
            </p>
            {staged.kind === "audio" && staged.preview && (
              <audio
                controls
                src={staged.preview}
                className="mt-2 w-full max-w-[240px]"
              >
                <track kind="captions" />
              </audio>
            )}
          </div>
          <button
            type="button"
            aria-label="Remove attachment"
            className="rounded p-1 text-slate-400 hover:text-rose-600"
            onClick={discard}
            disabled={working}
          >
            <Trash2 size={16} />
          </button>
        </div>
        {staged.kind !== "audio" && (
          <input
            aria-label="Caption"
            className="w-full rounded-xl border border-violet-100 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400 dark:border-slate-800 dark:bg-slate-900"
            placeholder="Add a caption (optional)"
            maxLength={1024}
            value={staged.caption}
            disabled={working}
            onChange={(e) => setStaged({ ...staged, caption: e.target.value })}
          />
        )}
        {phase === "uploading" && (
          <div
            role="progressbar"
            aria-valuenow={percent}
            aria-valuemin={0}
            aria-valuemax={100}
            className="h-1.5 overflow-hidden rounded-full bg-violet-100 dark:bg-slate-800"
          >
            <div
              className="h-full bg-indigo-600 transition-[width]"
              style={{ width: `${percent}%` }}
            />
          </div>
        )}
        {problem && (
          <p role="alert" className="text-xs text-rose-600">
            {problem}
          </p>
        )}
        <div className="flex gap-2">
          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            disabled={working || !account.ready}
            onClick={() => void sendAttachment()}
          >
            {working ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Send size={15} />
            )}
            {phase === "failed" ? "Retry" : "Send"}
          </button>
          <button
            type="button"
            className={secondary}
            onClick={discard}
            disabled={working}
          >
            <X size={15} />
            Cancel
          </button>
        </div>
      </div>
    );

  if (recording)
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50/60 p-3 dark:border-rose-900 dark:bg-rose-950/30">
        <span className="h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-rose-600" />
        <span className="text-sm font-semibold tabular-nums">
          {String(Math.floor(seconds / 60)).padStart(2, "0")}:
          {String(seconds % 60).padStart(2, "0")}
        </span>
        <span className="text-xs text-slate-500">Recording…</span>
        <button
          type="button"
          className="ml-auto inline-flex items-center gap-2 rounded-xl bg-indigo-700 px-3 py-2 text-sm font-semibold text-white"
          onClick={stopRecording}
        >
          <Square size={13} />
          Stop
        </button>
      </div>
    );

  return (
    <form
      className="space-y-2"
      onSubmit={(e) => {
        e.preventDefault();
        void sendText();
      }}
    >
      <input
        ref={picker}
        type="file"
        className="hidden"
        accept={picking.current?.accept}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file && picking.current) stage(file, picking.current.id);
          e.target.value = "";
        }}
      />
      <div className="flex items-end gap-2">
        <div className="relative shrink-0">
          <button
            type="button"
            aria-label="Add an attachment"
            aria-expanded={menu}
            className="rounded-full p-3 text-slate-500 hover:bg-violet-50 dark:hover:bg-slate-800"
            onClick={() => setMenu((open) => !open)}
          >
            <Paperclip size={18} />
          </button>
          {menu && (
            <div className="absolute bottom-14 left-0 z-10 w-44 overflow-hidden rounded-2xl border border-violet-100 bg-white shadow-lg dark:border-slate-800 dark:bg-slate-900">
              {ATTACHMENTS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm hover:bg-violet-50 dark:hover:bg-slate-800"
                  onClick={() => {
                    picking.current = option;
                    setMenu(false);
                    // Let the accept attribute apply before the dialog opens.
                    window.setTimeout(() => picker.current?.click(), 0);
                  }}
                >
                  <option.icon size={16} className="text-indigo-600" />
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </div>
        <textarea
          aria-label={`Reply to ${thread.contact_name || thread.destination}`}
          className="max-h-40 min-h-[44px] w-full flex-1 resize-y rounded-2xl border border-violet-100 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-400 dark:border-slate-800 dark:bg-slate-900"
          rows={2}
          maxLength={4096}
          placeholder="Write a reply…"
          value={body}
          disabled={busy || !account.ready}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              e.currentTarget.form?.requestSubmit();
            }
          }}
        />
        {body.trim() ? (
          <button
            type="submit"
            aria-label="Send reply"
            disabled={busy || !account.ready}
            className="shrink-0 rounded-full bg-indigo-700 p-3 text-white disabled:opacity-40"
          >
            {busy ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Send size={16} />
            )}
          </button>
        ) : (
          <button
            type="button"
            aria-label="Record a voice message"
            disabled={!account.ready}
            className="shrink-0 rounded-full bg-indigo-700 p-3 text-white disabled:opacity-40"
            onClick={() => void startRecording()}
          >
            <Mic size={16} />
          </button>
        )}
      </div>
    </form>
  );
}
