import axios from "axios";
import { useEffect, useState } from "react";
import { Eye, EyeOff, AlertCircle, ArrowRight, Building2, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import "./login-page.css";
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



  const inputClass = "w-full rounded-xl border border-slate-200 bg-slate-50/60 py-3 pl-11 pr-4 text-sm text-slate-900 transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100";
  const primaryClass = "client-login-primary group flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-medium text-white shadow-lg shadow-blue-600/20 transition hover:shadow-blue-600/30 disabled:opacity-60";

  return (
    <div className="client-login min-h-svh bg-slate-50 dark:bg-slate-950 lg:grid lg:grid-cols-[minmax(0,1.08fr)_minmax(0,1fr)]">
      {/* Brand panel: decorative product preview, hidden from assistive tech. */}
      <aside className="client-login-hero relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-between" aria-hidden="true">
        <div className="client-login-grid" />
        <span className="client-login-orb one" /><span className="client-login-orb two" />
        <div className="relative z-10 flex items-center gap-2 text-white">
          <img src="/voicedotslogo.svg" alt="" className="h-8 w-8 brightness-0 invert" />
          <span className="font-['Poppins'] text-2xl font-semibold tracking-tight">VoiceDots</span>
          <span className="ml-2 rounded-full border border-white/20 bg-white/10 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-blue-100">Client</span>
        </div>

        <div className="relative z-10 max-w-xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-blue-200">Placement &amp; institution management</p>
          <h2 className="mt-3 text-[clamp(28px,min(3.2vw,5.4vh),44px)] font-semibold leading-[1.12] tracking-tight text-white">Every placement drive,<br />in one clear view.</h2>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-blue-100/80">Run drives, review AI interview evidence and release results to students with confidence.</p>

          <div className="client-login-preview mt-[clamp(16px,3.4vh,32px)]">
            <div className="client-login-card main">
              <div className="flex items-center justify-between">
                <div><p className="text-[10px] uppercase tracking-[0.14em] text-blue-200/80">Drive overview</p><p className="mt-0.5 text-sm font-medium text-white">Backend Developer · Campus drive</p></div>
                <span className="client-login-live"><i />Live</span>
              </div>
              <div className="client-login-bars">{[38, 54, 46, 70, 62, 84, 76, 92].map((height, index) => <span key={index} style={{ height: `${height}%`, animationDelay: `${index * 70}ms` }} />)}</div>
              <div className="flex justify-between text-[10px] text-blue-100/60"><span>Readiness distribution</span><span>Released results</span></div>
            </div>
            <div className="client-login-card stat a"><p>Interviews completed</p><strong>128</strong><span>+18 this week</span></div>
            <div className="client-login-card stat b"><p>Avg. readiness</p><strong>72<small>/100</small></strong><span>Interview ready</span></div>
            <div className="client-login-card people">
              {[["AR", "Asha R.", "Shortlist", "ok"], ["RV", "Rahul V.", "Hold", "hold"], ["PN", "Priya N.", "Review", "review"]].map(([initials, name, status, tone], index) =>
                <div key={name} className="client-login-person" style={{ animationDelay: `${300 + index * 140}ms` }}><span className="avatar">{initials}</span><span className="name">{name}</span><span className={`pill ${tone}`}>{status}</span></div>)}
            </div>
          </div>
        </div>

        <div className="relative z-10 flex flex-wrap gap-x-6 gap-y-2 text-xs text-blue-100/70">
          <span className="flex items-center gap-1.5"><ShieldCheck size={14} /> Role-based access</span>
          <span className="flex items-center gap-1.5"><Building2 size={14} /> Institution-isolated data</span>
          <span className="flex items-center gap-1.5"><LockKeyhole size={14} /> Encrypted sessions</span>
        </div>
      </aside>

      {/* Sign-in */}
      <main className="flex min-h-svh flex-col items-center justify-center px-5 py-6 sm:px-8">
        <div className="client-login-form w-full max-w-[420px]">
          <div className="mb-[clamp(14px,3vh,28px)] flex items-center gap-2 lg:hidden">
            <img src="/voicedotslogo.svg" alt="" className="h-8 w-8" />
            <span className="font-['Poppins'] text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">VoiceDots</span>
          </div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-blue-600 dark:text-blue-400">Client portal</p>
          <h1 className="mt-2 text-[clamp(26px,4.4vh,34px)] font-semibold tracking-tight text-slate-900 dark:text-white">
            {setupToken ? "Set up your password" : "Welcome back"}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
            {setupToken ? setupLinkStatus === "checking" ? "Checking your secure invitation…" : setupLinkStatus === "completed" ? "Password already created. Sign in to continue." : setupLinkStatus === "expired" ? "This invitation has expired. Ask your Client administrator to send a new one." : setupLinkStatus === "invalid" ? "This invitation link is invalid. Ask your Client administrator to send a new one." : "Create a secure password for your placement account." : "Sign in to manage placements and your institution."}
          </p>

          <div className="mt-[clamp(16px,3.4vh,30px)]">
            {setupToken ? <>{setupLinkStatus === "valid" && <form className="space-y-4" onSubmit={handlePasswordSetup}>
              {error && <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm text-red-800 dark:border-red-900 dark:bg-red-900/10 dark:text-red-400"><AlertCircle size={16} className="mt-0.5 shrink-0" />{error}</div>}
              {setupComplete ? <div role="status" className="space-y-4 text-center"><p className="text-sm text-emerald-700">Password created. You can now sign in.</p><button type="button" className={primaryClass} onClick={() => window.location.assign("/login")}>Continue to sign in <ArrowRight size={16} /></button></div> : <>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">New password<span className="relative mt-1.5 block"><LockKeyhole size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" /><input type="password" required minLength={8} maxLength={128} value={password} onChange={e => setPassword(e.target.value)} className={inputClass} autoComplete="new-password" /></span></label>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Confirm password<span className="relative mt-1.5 block"><LockKeyhole size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" /><input type="password" required minLength={8} maxLength={128} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className={inputClass} autoComplete="new-password" /></span></label>
                <button type="submit" disabled={loading} className={primaryClass}>{loading ? "Saving…" : <>Set password <ArrowRight size={16} className="transition group-hover:translate-x-0.5" /></>}</button>
              </>}
            </form>}{(setupLinkStatus === "completed" || setupLinkStatus === "expired" || setupLinkStatus === "invalid") && <div role="status" className="space-y-4 text-center"><p className="text-sm text-slate-600 dark:text-slate-300">{setupLinkStatus === "completed" ? "This link has already been used. Sign in to open placement management." : "Ask your Client administrator to send a fresh invitation."}</p><button type="button" className={primaryClass} onClick={() => window.location.assign("/login")}>Continue to sign in <ArrowRight size={16} /></button></div>}</> : <form className="space-y-4" onSubmit={handleLogin}>
              {error && (
                <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm text-red-800 dark:border-red-900 dark:bg-red-900/10 dark:text-red-400" role="alert">
                  <AlertCircle size={16} className="mt-0.5 shrink-0" />
                  {error}
                </div>
              )}

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-200">Email address</label>
                <div className="relative mt-1.5">
                  <Mail size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input id="email" type="email" name="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@institution.edu" className={inputClass} />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-slate-700 dark:text-slate-200">Password</label>
                <div className="relative mt-1.5">
                  <LockKeyhole size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input id="password" name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="Enter your password" className={`${inputClass} pr-12`} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword} className="absolute right-1.5 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-lg text-slate-400 transition hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-slate-800">
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={loading} className={`${primaryClass} mt-2`}>
                {loading ? <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" aria-label="loading" /> : <>Sign in to Dashboard <ArrowRight size={16} className="transition group-hover:translate-x-0.5" /></>}
              </button>

              <p className="text-center text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                Forgot your password? Ask your VoiceDots administrator to send you a new setup link.
              </p>
            </form>}
          </div>

          <div className="mt-[clamp(16px,3.4vh,30px)] flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
            <ShieldCheck size={18} className="shrink-0 text-blue-600 dark:text-blue-400" />
            <span>Secure access for authorized placement and institution staff only.</span>
          </div>
          <p className="mt-4 text-center text-xs text-slate-400 dark:text-slate-500">© 2026 VoiceDots. All rights reserved.</p>
        </div>
      </main>
    </div>
  );
};

export default LoginPage;
