import axios from "axios";
import { useEffect, useState } from "react";
import { Eye, EyeOff, AlertCircle, ArrowRight, ArrowUpRight, BadgeCheck, BookOpen, FileText, Briefcase, GraduationCap, Mic, ShieldCheck, Users } from "lucide-react";
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



  const statusText = setupToken ? setupLinkStatus === "checking" ? "Checking your secure invitation…" : setupLinkStatus === "completed" ? "Password already created. Sign in to continue." : setupLinkStatus === "expired" ? "This invitation has expired. Ask your Client administrator to send a new one." : setupLinkStatus === "invalid" ? "This invitation link is invalid. Ask your Client administrator to send a new one." : "Create a secure password for your placement account." : "Sign in to manage placements and your institution.";

  return (
    <div className="cl-page">
      <header className="cl-header">
        <a className="cl-brand" href={import.meta.env.VITE_WEBSITE_URL || "https://voicedots.ai"} aria-label="VoiceDots website">
          <img src="/voicedotslogo.svg" alt="" /><span>oiceDots</span>
        </a>
        <a className="cl-back" href={import.meta.env.VITE_WEBSITE_URL || "https://voicedots.ai"}>Back to website <ArrowUpRight size={16} /></a>
      </header>

      <section className="cl-story" aria-label="VoiceDots client portal">
        <h1><span>Run placements.</span><span>Manage your</span><em>institution.</em></h1>
        <p>Create placement drives, manage students and departments, generate question papers and review AI interview results, all in one place.</p>
        <div className="cl-preview" aria-hidden="true">
          <div className="cl-preview-top"><span className="cl-preview-icon"><GraduationCap size={22} strokeWidth={2} /></span><div><strong>From students to offers.</strong><span>Your placement workflow, end to end</span></div></div>
          <ol className="cl-flow">
            {[
              { icon: Users, label: "Students" },
              { icon: Briefcase, label: "Drives" },
              { icon: Mic, label: "AI interviews" },
              { icon: BadgeCheck, label: "Results" },
            ].map(({ icon: Icon, label }, index) => <li key={label} style={{ ["--step" as string]: index }}><span><Icon size={18} /></span>{label}</li>)}
          </ol>
          <div className="cl-preview-bottom"><span>Built for placement teams</span><span><ShieldCheck size={12} /> Secure and role-based</span></div>
        </div>
        <div className="cl-features">
          {[{ icon: Users, text: "Students and departments" }, { icon: Briefcase, text: "Placement drives and results" }, { icon: FileText, text: "Question paper generation" }].map(({ icon: Icon, text }) => <div key={text}><Icon size={15} />{text}</div>)}
        </div>
      </section>

      <main className="cl-card">

        <span className="cl-eyebrow">YOUR CLIENT PORTAL</span>
        <h2>{setupToken ? "Set up your password." : "Welcome back."}</h2>
        <p>{statusText}</p>

        {setupToken ? <>{setupLinkStatus === "valid" && <form onSubmit={handlePasswordSetup}>
          {error && <div role="alert" className="cl-error"><AlertCircle size={16} />{error}</div>}
          {setupComplete ? <div role="status"><p className="cl-success">Password created. You can now sign in.</p><button type="button" className="cl-submit" onClick={() => window.location.assign("/login")}>Continue to sign in <ArrowRight size={16} /></button></div> : <>
            <label className="cl-label" htmlFor="new-password">New password</label>
            <input id="new-password" className="cl-input" type="password" required minLength={8} maxLength={128} value={password} onChange={e => setPassword(e.target.value)} autoComplete="new-password" />
            <label className="cl-label" htmlFor="confirm-password">Confirm password</label>
            <input id="confirm-password" className="cl-input" type="password" required minLength={8} maxLength={128} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} autoComplete="new-password" />
            <button type="submit" disabled={loading} className="cl-submit">{loading ? "Saving…" : <>Set password <ArrowRight size={16} /></>}</button>
          </>}
        </form>}{(setupLinkStatus === "completed" || setupLinkStatus === "expired" || setupLinkStatus === "invalid") && <div role="status"><p className="cl-note">{setupLinkStatus === "completed" ? "This link has already been used. Sign in to open placement management." : "Ask your Client administrator to send a fresh invitation."}</p><button type="button" className="cl-submit" onClick={() => window.location.assign("/login")}>Continue to sign in <ArrowRight size={16} /></button></div>}</> : <form onSubmit={handleLogin}>
          {error && <div className="cl-error" role="alert"><AlertCircle size={16} />{error}</div>}
          <label className="cl-label" htmlFor="email">Email address</label>
          <input id="email" type="email" name="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@institution.edu" className="cl-input" />
          <label className="cl-label" htmlFor="password">Password</label>
          <span className="cl-password">
            <input id="password" name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="Enter your password" className="cl-input" />
            <button type="button" className="cl-toggle" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
          </span>
          <button type="submit" disabled={loading} className="cl-submit">
            {loading ? <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" aria-label="loading" /> : <>Sign in to Dashboard <ArrowRight size={16} /></>}
          </button>
          <p className="cl-note">Forgot your password? Ask your VoiceDots administrator to send you a new setup link.</p>
        </form>}

        <div className="cl-help"><BookOpen size={17} /><p>Your VoiceDots administrator manages access to this portal. Contact them if you need an account or help signing in.</p></div>
      </main>
    </div>
  );
};

export default LoginPage;
