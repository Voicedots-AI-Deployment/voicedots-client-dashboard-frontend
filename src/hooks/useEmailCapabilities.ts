import { useEffect, useState } from "react";
import emailApi, { type EmailCapabilities } from "@/api/emailApi";
import { useAuth } from "@/context/AuthContext";

let cached: EmailCapabilities | null = null;
let pending: Promise<EmailCapabilities> | null = null;

export function useEmailCapabilities() {
  const { user } = useAuth();
  const [data, setData] = useState<EmailCapabilities | null>(cached);
  const [loading, setLoading] = useState(!cached);
  useEffect(() => {
    let current = true;
    if (user?.portal_role === "placement_staff") { setData(null); setLoading(false); return () => { current = false; }; }
    if (!pending) pending = emailApi.capabilities().finally(() => { pending = null; });
    pending.then((value) => { cached = value; if (current) setData(value); })
      .catch(() => { if (current) setData(null); }).finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [user?.portal_role]);
  return { capabilities: data, loading, enabled: data?.email_enabled === true };
}
