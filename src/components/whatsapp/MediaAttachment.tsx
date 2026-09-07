import { useEffect, useState } from "react";
import { Download, FileText, Loader2 } from "lucide-react";
import type { Media } from "@/api/whatsapp";
import { whatsappApi as api } from "@/api/whatsapp";
import { errorText, readableSize } from "./shared";

/** Renders one attachment inside a conversation bubble.
 *
 *  Bytes live at Meta, so nothing is fetched until the bubble mounts, and the
 *  object URL is revoked on unmount to avoid leaking blobs in a long thread. */
export default function MediaAttachment({
  media,
  outbound,
}: {
  media: Media;
  outbound: boolean;
}) {
  const [url, setUrl] = useState(""),
    [failed, setFailed] = useState("");
  const inline = media.kind === "image" || media.kind === "audio";
  useEffect(() => {
    if (!inline || media.status !== "uploaded") return;
    let active = true;
    let created = "";
    api
      .fetchMedia(media.id)
      .then((objectUrl) => {
        created = objectUrl;
        if (active) setUrl(objectUrl);
        else URL.revokeObjectURL(objectUrl);
      })
      .catch((e) => active && setFailed(errorText(e)));
    return () => {
      active = false;
      if (created) URL.revokeObjectURL(created);
    };
  }, [media.id, media.status, inline]);

  if (media.status === "failed")
    return (
      <p className="text-xs opacity-80">
        {media.error || "This attachment could not be uploaded."}
      </p>
    );

  if (media.kind === "image")
    return (
      <div className="overflow-hidden rounded-xl">
        {failed ? (
          <p className="p-3 text-xs opacity-80">{failed}</p>
        ) : url ? (
          <img
            src={url}
            alt={media.filename || "Image attachment"}
            className="max-h-72 w-full object-cover"
          />
        ) : (
          <div className="flex h-40 items-center justify-center bg-black/10">
            <Loader2 size={18} className="animate-spin opacity-70" />
          </div>
        )}
      </div>
    );

  if (media.kind === "audio")
    return failed ? (
      <p className="text-xs opacity-80">{failed}</p>
    ) : url ? (
      <audio controls src={url} className="w-full max-w-[260px]">
        <track kind="captions" />
      </audio>
    ) : (
      <div className="flex items-center gap-2 text-xs opacity-80">
        <Loader2 size={14} className="animate-spin" />
        Loading voice message…
      </div>
    );

  return (
    <button
      type="button"
      onClick={() => void api.downloadMedia(media.id, media.filename)}
      className={`flex w-full items-center gap-3 rounded-xl p-2.5 text-left ${outbound ? "bg-white/15 hover:bg-white/25" : "bg-black/5 hover:bg-black/10 dark:bg-white/10"}`}
    >
      <FileText size={20} className="shrink-0 opacity-80" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs font-semibold">
          {media.filename || "Attachment"}
        </span>
        <span className="block text-[10px] opacity-70">
          {readableSize(media.file_size)}
        </span>
      </span>
      <Download size={15} className="shrink-0 opacity-80" />
    </button>
  );
}
