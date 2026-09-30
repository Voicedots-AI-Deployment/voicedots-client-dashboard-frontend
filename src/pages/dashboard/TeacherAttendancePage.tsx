import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

const WIDGET_SCRIPT = 'https://cdn.jsdelivr.net/gh/Voicedots-AI/client-ai-widget-source@main/builds/dscet/widget.js';
const DSCET_WORKSPACE = '348e9748-917d-421e-990f-c7f921f96df8';
const WIDGET_CONFIG = JSON.stringify({
  title: 'DSCET staff workspace',
  pipeline: 'gemini',
  agentId: 'voicedots_agent_dscet9m2q1h8z5t6w3v0pajcylrbsfde',
  attendanceWorkspace: DSCET_WORKSPACE,
  openStaffOnLoad: true,
  avatars: [],
  logo: 'https://cdn.jsdelivr.net/gh/Voicedots-AI-Deployment/animations@main/voicedotslogo.svg',
});

/** Staff use their existing face verification; no client-dashboard login is needed. */
export default function TeacherAttendancePage() {
  const host = useRef<HTMLDivElement>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (!host.current) return;
    const widget = document.createElement('voicedots-ai');
    widget.setAttribute('config', WIDGET_CONFIG);
    host.current.appendChild(widget);

    if (!document.getElementById('dscet-staff-widget-script')) {
      const script = document.createElement('script');
      script.id = 'dscet-staff-widget-script';
      script.type = 'module';
      script.setAttribute('name', 'subagent-key');
      script.src = WIDGET_SCRIPT;
      script.onerror = () => setLoadError(true);
      document.head.appendChild(script);
    }
    return () => widget.remove();
  }, []);

  return <main className="min-h-screen bg-slate-50 px-4 py-12 text-slate-900 dark:bg-slate-950 dark:text-white">
    <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <p className="text-sm font-semibold text-indigo-600">Dhanalakshmi Srinivasan CET</p>
      <h1 className="mt-2 text-3xl font-bold">Department teacher workspace</h1>
      <p className="mt-3 text-slate-600 dark:text-slate-300">Verify your face to manage attendance and students in your assigned departments. You can add student details, fees, payments, and marks here.</p>
      <p className="mt-4 text-sm text-slate-500">Your staff workspace opens automatically. If you close it, open the VoiceDots button in the bottom corner and choose Staff attendance.</p>
      {loadError && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">The staff workspace could not load. Refresh this page and try again.</p>}
      <Link className="mt-6 inline-block text-sm font-medium text-indigo-600 underline" to="/login">Client administrator sign in</Link>
    </div>
    <div ref={host} />
  </main>;
}
