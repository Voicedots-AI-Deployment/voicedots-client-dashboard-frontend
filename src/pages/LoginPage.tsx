import axios from "axios";
import { useEffect, useState } from "react";
import { Eye, EyeOff, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import authApi from "@/api/authApi";
import { useAuth } from "@/context/AuthContext";
import { useSearchParams } from "react-router-dom";
import { apiClient, setAuthHeader } from "@/api/apiClient";

const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [searchParams] = useSearchParams();
  const setupToken = searchParams.get("setup_token");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [setupComplete, setSetupComplete] = useState(false);
  const [setupLinkStatus, setSetupLinkStatus] = useState<"checking" | "valid" | "completed" | "expired" | "invalid">(setupToken ? "checking" : "valid");

  useEffect(() => {
    if (!setupToken) return;
    let active = true;
    void apiClient.post<{status: "valid" | "completed" | "expired" | "invalid"}>("/v3/auth/password-setup/status", { token: setupToken })
      .then(({data}) => { if (active) setSetupLinkStatus(data.status || "invalid"); })
      .catch(() => { if (active) setSetupLinkStatus("invalid"); });
    return () => { active = false; };
  }, [setupToken]);


  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Please enter your administrator credentials.");
      return;
    }

    try {
      setLoading(true);
      await authApi.login(email, password);
      await login();
      navigate("/dashboard", { replace: true });
    } catch (err: any) {
      const detail = axios.isAxiosError(err) ? err.response?.data?.detail : undefined;
      const status = axios.isAxiosError(err) ? err.response?.status : undefined;
      setError(typeof detail === "string" ? detail : status === 401
        ? "Invalid email or password"
        : status && status >= 500 ? "Sign-in is temporarily unavailable. Please try again."
        : "Could not connect to VoiceDots. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSetup = async (e: React.FormEvent) => {
    e.preventDefault(); setError("");
    if (!setupToken) return;
    if (password.length < 8) { setError("Choose a password with at least 8 characters."); return; }
    if (password !== confirmPassword) { setError("The passwords do not match."); return; }
    setLoading(true);
    try {
      const {data} = await apiClient.post<{access_token?: string}>("/v3/auth/password-setup/redeem", { token: setupToken, password });
      if (data.access_token) {
        setAuthHeader(data.access_token);
        await login();
        navigate("/dashboard/placement-management", { replace: true });
      } else {
        setSetupComplete(true); setPassword(""); setConfirmPassword("");
      }
    } catch (err: any) { setError(err?.response?.data?.detail || "This setup link is invalid or expired. Ask your Client administrator for a new invitation."); }
    finally { setLoading(false); }
  };


  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-6">
          <h3
            className="
            text-xl md:text-2xl font-medium tracking-tighter mb-6
            bg-clip-text
            bg-gradient-to-b
            from-foreground to-foreground/60
          "
          >
            <img
              src="/voicedotslogo.svg"
              alt="V"
              className="h-[1.1em] w-auto inline-block align-middle -translate-y-[0.1em] mr-[-0.3em]"
            />oiceDots
          </h3>

          <h1 className="text-3xl font-medium text-gray-900 dark:text-white">
            {setupToken ? "Set up your password" : "Client Portal"}
          </h1>

          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            {setupToken ? setupLinkStatus === "checking" ? "Checking your secure invitation…" : setupLinkStatus === "completed" ? "Password already created. Sign in to continue." : setupLinkStatus === "expired" ? "This invitation has expired. Ask your Client administrator to send a new one." : setupLinkStatus === "invalid" ? "This invitation link is invalid. Ask your Client administrator to send a new one." : "Create a secure password for your placement account." : "Secure access for authorized personnel only"}
          </p>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-gray-200 dark:border-slate-700 px-6 py-8 sm:px-8">
          {setupToken ? <>{setupLinkStatus === "valid" && <form className="space-y-6" onSubmit={handlePasswordSetup}>
            {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}
            {setupComplete ? <div role="status" className="space-y-4 text-center"><p className="text-sm text-emerald-700">Password created. You can now sign in.</p><button type="button" className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-normal text-white" onClick={() => window.location.assign("/login")}>Continue to sign in</button></div> : <>
              <label className="block text-sm font-medium">New password<input type="password" required minLength={8} maxLength={128} value={password} onChange={e => setPassword(e.target.value)} className="mt-1 w-full rounded-lg border px-4 py-3 text-sm" autoComplete="new-password" /></label>
              <label className="block text-sm font-medium">Confirm password<input type="password" required minLength={8} maxLength={128} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="mt-1 w-full rounded-lg border px-4 py-3 text-sm" autoComplete="new-password" /></label>
              <button type="submit" disabled={loading} className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-normal text-white disabled:opacity-50">{loading ? "Saving…" : "Set password"}</button>
            </>}
          </form>}{(setupLinkStatus === "completed" || setupLinkStatus === "expired" || setupLinkStatus === "invalid") && <div role="status" className="space-y-4 text-center"><p className="text-sm text-slate-600">{setupLinkStatus === "completed" ? "This link has already been used. Sign in to open placement management." : "Ask your Client administrator to send a fresh invitation."}</p><button type="button" className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-normal text-white" onClick={() => window.location.assign("/login")}>Continue to sign in</button></div>}</> : <form className="space-y-6" onSubmit={handleLogin}>
            {/* Error */}
            {error && (
              <div
                className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-900/10 dark:text-red-400"
                role="alert"
              >
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-normal text-gray-700 dark:text-gray-200"
              >
                Email address
              </label>
              <input
                id="email"
                type="email"
                name="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="admin@voicedots.com"
                className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-slate-900 dark:border-slate-700 dark:text-gray-200"
              />
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-normal text-gray-700 dark:text-gray-200"
              >
                Password
              </label>

              <div className="relative mt-1">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 pr-10 text-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-slate-900 dark:border-slate-700 dark:text-gray-200"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-blue-600"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Remember + Forgot */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-slate-700"
                />
                Trust this device
              </label>

              <a
                href="#"
                className="text-sm font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400"
              >
                Forgot password?
              </a>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-normal tracking-wide text-white hover:bg-blue-700 disabled:opacity-50 transition"
            >
              {loading ? (
                <span
                  className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
                  aria-label="loading"
                />
              ) : (
                "Sign in to Dashboard"
              )}
            </button>

            {/* Divider */}
            <div className="relative pt-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200 dark:border-slate-700" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-white dark:bg-slate-800 px-2 text-xs text-gray-500">
                  Security Verified
                </span>
              </div>
            </div>
          </form>}
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-gray-400 dark:text-gray-500">
          © 2026 Voicedots. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
