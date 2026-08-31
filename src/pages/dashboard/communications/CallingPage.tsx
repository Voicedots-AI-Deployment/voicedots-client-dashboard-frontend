import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, Loader2, Phone, RefreshCw, ShieldCheck, Square, Upload } from 'lucide-react';
import { phoneAgentsApi, type ClientPhoneAgent } from '@/api/phoneAgents';
import { outboundCallsApi, type OutboundAgent } from '@/api/outboundCalls';
import { outboundBatchesApi, type BatchDetails, type BatchSummary, type BatchUploadResult } from '@/api/outboundBatches';

const card = 'rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900';
const input = 'mt-1 w-full rounded-xl border border-slate-200 bg-transparent p-3 dark:border-slate-700';
const consentText = 'I confirm every recipient in this file consented to receive this call and the campaign complies with applicable calling rules.';
type ApiError = { response?: { data?: { detail?: string | { reasons?: string[]; message?: string } } } };
const errorMessage = (error: unknown, fallback: string) => {
  const detail = (error as ApiError)?.response?.data?.detail;
  return typeof detail === 'string' ? detail : detail?.reasons?.join(' · ') || detail?.message || fallback;
};

function StatusBadge({ value }: { value: string }) {
  const tone = value === 'completed' || value === 'connected' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
    : value === 'failed' || value === 'blocked' ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
      : value === 'running' || value === 'queued' || value === 'dialing' ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
        : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${tone}`}>{value.replaceAll('_', ' ')}</span>;
}

export default function CallingPage() {
  const [agents, setAgents] = useState<ClientPhoneAgent[]>([]), [selectedId, setSelectedId] = useState('');
  const [outbound, setOutbound] = useState<OutboundAgent[]>([]), [tab, setTab] = useState<'campaigns' | 'single'>('campaigns');
  const [message, setMessage] = useState(''), [name, setName] = useState(''), [number, setNumber] = useState('');
  const [singleConsent, setSingleConsent] = useState(false), [calling, setCalling] = useState(false);
  const [batches, setBatches] = useState<BatchSummary[]>([]), [details, setDetails] = useState<BatchDetails | null>(null);
  const [file, setFile] = useState<File | null>(null), [batchConsent, setBatchConsent] = useState(false);
  const [uploadResult, setUploadResult] = useState<BatchUploadResult | null>(null), [busy, setBusy] = useState(false);

  const selected = agents.find((agent) => agent.id === selectedId) || agents[0] || null;
  const config = useMemo(() => outbound.find((item) => item.id === selected?.id) || null, [outbound, selected]);
  const capacity = selected?.dids.reduce((total, did) => total + did.channel_limit, 0) || 0;
  const ready = !!config && config.platform_enabled && config.enabled && (config.mode === 'outbound' || config.mode === 'both') && config.status === 'active' && !!config.outbound_trunk_id;
  const reasons = !config ? ['No outbound configuration is assigned to this agent.'] : [!config.platform_enabled ? 'Outbound calling is paused by the administrator.' : '', !config.enabled ? 'This agent is not enabled for outbound calls.' : '', config.mode === 'inbound' ? 'This agent is configured for inbound calls only.' : '', !config.outbound_trunk_id ? 'No outbound trunk is assigned.' : ''].filter(Boolean);
  const pollingBatchId = details?.id;
  const pollingBatchStatus = details?.status;

  const loadBatches = useCallback(async () => { try { setBatches(await outboundBatchesApi.list()); } catch (error) { setMessage(errorMessage(error, 'Unable to load campaign history.')); } }, []);
  const loadDetails = useCallback(async (id: string) => { try { setDetails(await outboundBatchesApi.get(id)); } catch (error) { setMessage(errorMessage(error, 'Unable to load campaign details.')); } }, []);

  useEffect(() => {
    Promise.allSettled([phoneAgentsApi.list(), outboundCallsApi.list(), outboundBatchesApi.list()]).then(([agentResult, outboundResult, batchResult]) => {
      if (agentResult.status === 'fulfilled') { setAgents(agentResult.value); setSelectedId(agentResult.value[0]?.id || ''); } else setMessage('Unable to load assigned phone agents.');
      if (outboundResult.status === 'fulfilled') setOutbound(outboundResult.value); else setMessage('Unable to load outbound calling configuration.');
      if (batchResult.status === 'fulfilled') setBatches(batchResult.value); else setMessage('Unable to load campaign history.');
    });
  }, []);
  useEffect(() => {
    if (!pollingBatchId || pollingBatchStatus !== 'running') return;
    const timer = window.setInterval(() => { loadDetails(pollingBatchId); loadBatches(); }, 3000);
    return () => window.clearInterval(timer);
  }, [pollingBatchId, pollingBatchStatus, loadBatches, loadDetails]);

  const placeCall = async () => {
    if (!config || !ready) return;
    if (!name.trim() || !number.trim() || !singleConsent) { setMessage('Enter a contact, use an international number, and confirm consent.'); return; }
    setCalling(true); setMessage('');
    try { const result = await outboundCallsApi.create({ phone_agent_id: config.id, destination: number.trim(), contact_name: name.trim(), consent_confirmed: true }); setMessage(`Call queued (${result.id}).`); setName(''); setNumber(''); setSingleConsent(false); }
    catch (error) { setMessage(errorMessage(error, 'Call could not be queued.')); } finally { setCalling(false); }
  };
  const uploadBatch = async () => {
    if (!config || !file || !batchConsent) { setMessage('Select a contact file and confirm consent before uploading.'); return; }
    setBusy(true); setMessage('');
    try {
      const result = await outboundBatchesApi.upload({ file, phoneAgentId: config.id, consentDeclaration: consentText, concurrency: Math.max(1, Math.min(capacity || 1, 20)) });
      setUploadResult(result); await loadDetails(result.id); await loadBatches();
      setMessage(`${result.accepted} contacts accepted${result.rejected_count ? `; ${result.rejected_count} rejected` : ''}. Review and start the campaign.`);
    } catch (error) { setMessage(errorMessage(error, 'Contact file could not be uploaded.')); } finally { setBusy(false); }
  };
  const startBatch = async (id: string) => {
    setBusy(true); setMessage('');
    try { await outboundBatchesApi.start(id); await Promise.all([loadDetails(id), loadBatches()]); setUploadResult(null); setFile(null); setBatchConsent(false); setMessage('Campaign started. Progress updates automatically.'); }
    catch (error) { setMessage(errorMessage(error, 'Campaign could not be started.')); } finally { setBusy(false); }
  };
  const cancelBatch = async (id: string) => {
    if (!window.confirm('Stop this campaign? Calls already in progress will finish.')) return;
    setBusy(true);
    try { await outboundBatchesApi.cancel(id); await Promise.all([loadDetails(id), loadBatches()]); setMessage('Campaign cancelled.'); }
    catch (error) { setMessage(errorMessage(error, 'Campaign could not be cancelled.')); } finally { setBusy(false); }
  };

  return <div className="space-y-6">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><h1 className="text-2xl font-bold text-slate-900 dark:text-white">AI Calling</h1><p className="mt-1 text-sm text-slate-500">Place individual calls and manage consented outbound campaigns.</p></div>{agents.length > 1 && <label className="text-sm font-medium">Phone agent<select className={`${input} min-w-64`} value={selected?.id || ''} onChange={(event) => setSelectedId(event.target.value)}>{agents.map((agent) => <option key={agent.id} value={agent.id}>{agent.display_name}</option>)}</select></label>}</div>
    <div className="grid gap-4 sm:grid-cols-3"><div className={`${card} p-4`}><div className="text-xs text-slate-500">Status</div><div className="mt-1 flex items-center gap-2 font-bold"><CheckCircle2 size={17} className={ready ? 'text-emerald-500' : 'text-amber-500'} />{ready ? 'Ready' : selected?.status || 'Pending'}</div></div><div className={`${card} p-4`}><div className="text-xs text-slate-500">Assigned number</div><div className="mt-1 font-bold">{selected?.dids.map((did) => did.did).join(', ') || 'Pending'}</div></div><div className={`${card} p-4`}><div className="text-xs text-slate-500">Capacity</div><div className="mt-1 font-bold">{capacity} concurrent call(s)</div></div></div>
    {!ready && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/20 dark:text-amber-300"><strong>Outbound calls are unavailable.</strong><ul className="mt-2 list-disc pl-5">{reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul></div>}
    {message && <div className="rounded-xl bg-slate-100 p-3 text-sm dark:bg-slate-800">{message}</div>}
    <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800">{([['campaigns', 'Campaigns'], ['single', 'Single call']] as const).map(([value, label]) => <button key={value} onClick={() => setTab(value)} className={`border-b-2 px-4 py-3 text-sm font-semibold ${tab === value ? 'border-violet-600 text-violet-600' : 'border-transparent text-slate-500'}`}>{label}</button>)}</div>

    {tab === 'single' ? <div className="grid gap-5 lg:grid-cols-2"><section className={`${card} p-5`}><div className="flex items-center gap-2"><Phone className="text-violet-600" /><h2 className="text-lg font-bold">Place an outbound call</h2></div><div className="mt-5 space-y-4"><label className="block text-sm font-medium">Contact name<input className={input} value={name} onChange={(event) => setName(event.target.value)} placeholder="Customer name" /></label><label className="block text-sm font-medium">Phone number<input className={input} value={number} onChange={(event) => setNumber(event.target.value)} placeholder="+919876543210" /><span className="mt-1 block text-xs text-slate-500">Include country code in E.164 format.</span></label><label className="flex items-start gap-3 rounded-xl border p-3 text-sm"><input type="checkbox" className="mt-1" checked={singleConsent} onChange={(event) => setSingleConsent(event.target.checked)} /><span>I confirm this recipient consented to receive this call.</span></label><button onClick={placeCall} disabled={calling || !ready} className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 p-3 font-semibold text-white disabled:opacity-50">{calling ? <Loader2 className="animate-spin" size={18} /> : <Phone size={18} />}Start outbound call</button></div></section><section className={`${card} p-5`}><div className="flex items-center gap-2"><ShieldCheck className="text-violet-600" /><h2 className="text-lg font-bold">Call safeguards</h2></div><dl className="mt-5 space-y-4 text-sm"><div><dt className="text-slate-500">Daily call limit</dt><dd className="font-semibold">{config?.daily_limit ?? '—'}</dd></div><div><dt className="text-slate-500">Maximum duration</dt><dd className="font-semibold">{config ? `${Math.round(config.max_duration_seconds / 60)} minutes` : '—'}</dd></div><div><dt className="text-slate-500">Caller ID</dt><dd className="font-semibold">{config?.did || 'Not assigned'}</dd></div></dl></section></div> : <div className="space-y-5">
      <section className={`${card} p-5`}><div className="flex items-center gap-2"><Upload className="text-violet-600" /><h2 className="text-lg font-bold">New campaign</h2></div><div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1fr_auto] lg:items-end"><label className="text-sm font-medium">Contact sheet (.csv or .xlsx)<input type="file" accept=".csv,.xlsx" className={input} onChange={(event) => { setFile(event.target.files?.[0] || null); setUploadResult(null); }} /></label><label className="flex min-h-12 items-start gap-3 rounded-xl border p-3 text-sm"><input type="checkbox" className="mt-1" checked={batchConsent} onChange={(event) => setBatchConsent(event.target.checked)} /><span>{consentText}</span></label><button onClick={uploadBatch} disabled={busy || !ready || !file || !batchConsent} className="flex h-12 items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 font-semibold text-white disabled:opacity-50">{busy ? <Loader2 className="animate-spin" size={18} /> : <FileSpreadsheet size={18} />}Upload & validate</button></div>{uploadResult && <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950/20"><div><strong>{uploadResult.accepted} contacts ready</strong><div className="text-sm text-slate-600 dark:text-slate-300">{uploadResult.rejected_count} rejected · daily limit {uploadResult.daily_limit}</div></div><button onClick={() => startBatch(uploadResult.id)} disabled={busy} className="rounded-xl bg-emerald-600 px-5 py-2.5 font-semibold text-white disabled:opacity-50">Start campaign</button></div>}</section>
      <div className="grid gap-5 xl:grid-cols-[340px_1fr]"><section className={`${card} overflow-hidden`}><div className="flex items-center justify-between border-b p-4 dark:border-slate-800"><h2 className="font-bold">Campaign history</h2><button title="Refresh" onClick={loadBatches} className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800"><RefreshCw size={16} /></button></div><div className="max-h-[620px] overflow-y-auto">{batches.length ? batches.map((batch) => <button key={batch.id} onClick={() => loadDetails(batch.id)} className={`w-full border-b p-4 text-left dark:border-slate-800 ${details?.id === batch.id ? 'bg-violet-50 dark:bg-violet-950/20' : 'hover:bg-slate-50 dark:hover:bg-slate-800'}`}><div className="flex items-center justify-between gap-2"><span className="truncate font-semibold">{batch.filename}</span><StatusBadge value={batch.status} /></div><div className="mt-2 text-xs text-slate-500">{batch.completed + batch.failed}/{batch.total_contacts} processed · {new Date(batch.created_at).toLocaleString()}</div></button>) : <p className="p-6 text-center text-sm text-slate-500">No campaigns yet.</p>}</div></section>
        <section className={`${card} min-w-0 overflow-hidden`}>{!details ? <div className="p-12 text-center text-slate-500"><FileSpreadsheet className="mx-auto mb-3" />Select a campaign to see progress and contacts.</div> : <><div className="border-b p-5 dark:border-slate-800"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex items-center gap-2"><h2 className="text-lg font-bold">{details.filename}</h2><StatusBadge value={details.status} /></div><p className="mt-1 text-sm text-slate-500">{details.agent_name} · {details.total_contacts} contacts</p></div><div className="flex gap-2">{details.report_ready && <button onClick={() => outboundBatchesApi.downloadReport(details.id, details.filename)} className="flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold"><Download size={16} />Report</button>}{details.status === 'running' && <button onClick={() => cancelBatch(details.id)} disabled={busy} className="flex items-center gap-2 rounded-xl bg-rose-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"><Square size={14} />Cancel</button>}</div></div><div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full bg-violet-600 transition-all" style={{ width: `${details.progress_percent}%` }} /></div><div className="mt-2 flex flex-wrap justify-between gap-2 text-xs text-slate-500"><span>{details.progress_percent}% · {details.completed_contacts}/{details.total_contacts} processed</span><span>Connected {details.counts.completed || 0} · Failed {details.counts.failed || 0} · Pending {details.counts.pending || 0} · Active {details.counts.queued || 0}</span></div></div>
          <div className="max-h-[490px] overflow-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="sticky top-0 bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-800"><tr><th className="p-3">#</th><th className="p-3">Contact</th><th className="p-3">Phone</th><th className="p-3">Status</th><th className="p-3">Outcome</th><th className="p-3">Conversation</th></tr></thead><tbody>{details.contacts.map((contact) => <tr key={contact.row_number} className="border-t dark:border-slate-800"><td className="p-3 text-slate-500">{contact.row_number}</td><td className="p-3 font-medium">{contact.contact_name}</td><td className="p-3">{contact.destination}</td><td className="p-3"><StatusBadge value={contact.status} /></td><td className="max-w-64 truncate p-3 text-xs text-slate-500" title={contact.error}>{contact.call_status || contact.error || '—'}</td><td className="p-3">{contact.conversation_id ? <a className="font-semibold text-violet-600 hover:underline" href={`/dashboard/conversations/${contact.conversation_id}`}>View transcript</a> : '—'}</td></tr>)}</tbody></table></div>{(details.counts.failed || 0) > 0 && <div className="flex items-start gap-2 border-t bg-amber-50 p-3 text-xs text-amber-800 dark:border-slate-800 dark:bg-amber-950/20 dark:text-amber-300"><AlertTriangle size={15} className="mt-0.5 shrink-0" />Failed contacts remain visible in the report and can be used to prepare a consented retry list.</div>}</>}</section>
      </div>
    </div>}
  </div>;
}
