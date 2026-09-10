import { Navigate, Outlet } from "react-router-dom";
import { useEmailCapabilities } from "@/hooks/useEmailCapabilities";

export default function EmailFeatureGuard() {
  const { enabled, loading } = useEmailCapabilities();
  if (loading) return <div className="flex min-h-48 items-center justify-center text-sm text-slate-500">Checking Email access…</div>;
  return enabled ? <Outlet /> : <Navigate to="/dashboard" replace />;
}
