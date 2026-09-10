import { useEffect, useState } from "react";
import emailApi, { type EmailCapabilities } from "@/api/emailApi";

let cached: EmailCapabilities | null = null;
let pending: Promise<EmailCapabilities> | null = null;

export function useEmailCapabilities() {
  const [data, setData] = useState<EmailCapabilities | null>(cached);
  const [loading, setLoading] = useState(!cached);
  useEffect(() => {
    let current = true;
    if (!pending) pending = emailApi.capabilities().finally(() => { pending = null; });
    pending.then((value) => { cached = value; if (current) setData(value); })
      .catch(() => { if (current) setData(null); }).finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, []);
  return { capabilities: data, loading, enabled: data?.email_enabled === true };
}
