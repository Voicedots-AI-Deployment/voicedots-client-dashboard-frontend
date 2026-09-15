import { useEffect, useState, type FormEvent } from 'react';
import { collegeApi, collegeError } from '@/api/collegeApi';

import { tracks, agentOptions, selectionName, field, btn, panel, type Agent, type AgentLibrary, type Selection } from './interviewAgentTypes';

export default function InterviewAgents() {
  const [library, setLibrary] = useState<AgentLibrary | null>(null), [editing, setEditing] = useState<Agent | null>(null);
  const [error, setError] = useState(''), [busy, setBusy] = useState(false);
  async function refresh() { try { setLibrary(await collegeApi.get<AgentLibrary>('agents')); } catch (e) { setError(collegeError(e)); } }
  useEffect(() => { void refresh(); }, []);
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); if (!editing) return; setBusy(true); setError('');
    const data = new FormData(e.currentTarget);
    try { await collegeApi.save(editing.id ? `agents/${editing.id}` : 'agents', { ...editing, ...Object.fromEntries(data), make_active: false }, !!editing.id); setEditing(null); await refresh(); }
    catch (e) { setError(collegeError(e)); } finally { setBusy(false); }
  }
  async function remove(agent: Agent) {
    if (!agent.id) return; setBusy(true); setError('');
    try { await collegeApi.remove(`agents/${agent.id}`); await refresh(); } catch (e) { setError(collegeError(e)); } finally { setBusy(false); }
  }
  return <section className="space-y-5">
    <div className="flex items-center justify-between gap-3"><p className="text-sm text-slate-500">Default agents are locked. Create reusable custom interview agents for your drives.</p><button className={btn} disabled={busy} onClick={() => setEditing({ track: 'domain', name: '', role: '', intro_message: 'Hello {name}, welcome to your interview for {role} at {company}.', personality_prompt: '', tone: 'professional', voice_id: 'flux-priya-en' })}>Create agent</button></div>
    {error && <p role="alert" className="text-rose-600">{error}</p>}
    {!library && !error && <p role="status">Loading agents…</p>}
    {editing && <form key={editing.id || "new"} className={`${panel} space-y-4`} onSubmit={save}>
      <h3 className="font-bold">{editing.id ? 'Edit custom agent' : 'Create custom agent'}</h3>
      <label className="block text-sm">Name<input name="name" className={field} required maxLength={120} defaultValue={editing.name} /></label>
      <label className="block text-sm">Role<input name="role" className={field} required maxLength={120} defaultValue={editing.role} /></label>
      <label className="block text-sm">First message<textarea name="intro_message" className={field} required maxLength={500} defaultValue={editing.intro_message} /></label>
      <label className="block text-sm">System prompt<textarea name="personality_prompt" className={field} required rows={5} maxLength={4000} defaultValue={editing.personality_prompt} /></label>
      <p className="text-xs text-slate-500">Available variables: {'{name}'}, {'{role}'}, {'{company}'}, {'{department}'}. Name refers to the student; role refers to the drive role.</p>
      <div className="flex gap-3"><button className={btn} disabled={busy}>Save agent</button><button type="button" className={btn} disabled={busy} onClick={() => setEditing(null)}>Cancel</button></div>
    </form>}
    <div className="grid gap-4 md:grid-cols-2">{agentOptions(library).map(a => <article key={a.id || a.track} className={panel}><div className="flex justify-between"><h3 className="font-bold">{a.name}</h3><span className="text-xs text-slate-500">{a.id ? 'Custom' : 'Locked default'}</span></div><p className="mt-2 text-sm">{a.role}</p><p className="mt-3 text-sm text-slate-500">{a.intro_message}</p>{a.id && <div className="mt-4 flex gap-3"><button className={btn} disabled={busy} onClick={() => setEditing(a)}>Edit</button><button className={btn} disabled={busy} onClick={() => void remove(a)}>Delete</button></div>}</article>)}</div>
  </section>;
}

export function DriveInterviewSetup({ selection, setSelection, source, setSource, questions, setQuestions, form, busy, onGenerating }: {
  selection: Selection[]; setSelection: (value: Selection[]) => void; source: string; setSource: (value: string) => void;
  questions: Record<string, string[]>; setQuestions: (value: Record<string, string[]>) => void; form: HTMLFormElement | null; busy: boolean; onGenerating: (value: boolean) => void;
}) {
  const [library, setLibrary] = useState<AgentLibrary | null>(null), [error, setError] = useState(''), [generating, setGenerating] = useState(false);
  useEffect(() => { const c = new AbortController(); collegeApi.get<AgentLibrary>('agents', c.signal).then(setLibrary).catch(e => { if (!c.signal.aborted) setError(collegeError(e)); }); return () => c.abort(); }, []);
  const options = agentOptions(library);
  function add(key: string) {
    const agent = options.find(a => (a.id || a.track) === key); if (!agent || selection.length >= 4) return;
    const occupied = selection.map(s => s.track);
    const slot = !agent.id ? agent.track : !occupied.includes(agent.track) ? agent.track : tracks.find(t => !occupied.includes(t));
    if (!slot) return;
    const next = [...selection];
    if (!agent.id && occupied.includes(slot)) {
      const index = next.findIndex(s => s.track === slot); const free = tracks.find(t => !occupied.includes(t));
      if (!free || !next[index].agent_id) return;
      const moved = next[index]; next[index] = { ...moved, track: free };
      const updated = { ...questions, [free]: questions[slot] || [] }; delete updated[slot]; setQuestions(updated);
    }
    next.push({ track: slot, agent_id: agent.id || null }); setSelection(next);
  }
  async function generate() {
    if (!form) return; const f = new FormData(form); setGenerating(true); onGenerating(true); setError('');
    try { const result = await collegeApi.save<{ scripted_questions: Record<string, string[]> }>('drive-questions/preview', { role_title: f.get('role_title'), jd_text: f.get('jd_text'), interview_duration_minutes: Number(f.get('duration')), agent_selection: selection.map(({ track, agent_id }) => ({ track, agent_id })) }); setQuestions(result.scripted_questions); }
    catch (e) { setError(collegeError(e)); } finally { setGenerating(false); onGenerating(false); }
  }
  return <fieldset className="space-y-4 sm:col-span-2" disabled={busy || generating}>
    <legend className="font-semibold">Select interview agents / rounds ({selection.length}/4)</legend>
    {selection.map((item, i) => <div key={item.track} className="flex items-center gap-2 rounded-xl border p-3"><span className="flex-1 text-sm">{i + 1}. {selectionName(item, library)}</span><button type="button" className={btn} disabled={i === 0} aria-label={`Move round ${i + 1} up`} onClick={() => { const next = [...selection]; [next[i - 1], next[i]] = [next[i], next[i - 1]]; setSelection(next); }}>↑</button><button type="button" className={btn} disabled={i === selection.length - 1} aria-label={`Move round ${i + 1} down`} onClick={() => { const next = [...selection]; [next[i + 1], next[i]] = [next[i], next[i + 1]]; setSelection(next); }}>↓</button><button type="button" className={btn} onClick={() => { setSelection(selection.filter((_, n) => n !== i)); const next = { ...questions }; delete next[item.track]; setQuestions(next); }}>Remove</button></div>)}
    <label className="block text-sm">Add agent<select className={field} value="" disabled={selection.length >= 4 || !library} onChange={e => add(e.target.value)}><option value="">Select an agent</option>{options.filter(a => !selection.some(s => a.id ? s.agent_id === a.id : !s.agent_id && s.track === a.track)).map(a => <option key={a.id || a.track} value={a.id || a.track}>{a.name} — {a.role}</option>)}</select></label>
    <label className="block text-sm">Question source<select className={field} value={source} onChange={e => setSource(e.target.value)}><option value="personalized">Personalized AI questions</option><option value="manual">Manual questions</option><option value="ai_generated">AI generate before creating drive</option></select></label>
    {source === 'personalized' ? <p className="text-sm text-slate-500">Each student's resume is matched against the drive role and JD to plan adaptive questions within the interview duration.</p> : <>
      <p className="text-sm text-slate-500">Questions are asked in the order saved for each round. Allow roughly two minutes per question, plus two minutes for opening and closing.</p>
      {source === 'ai_generated' && <button type="button" className={btn} disabled={!selection.length} onClick={() => void generate()}>{generating ? 'Generating questions…' : 'Generate questions from role + JD'}</button>}
      {selection.map(item => <section key={item.track} className="space-y-2"><h4 className="font-medium">{selectionName(item, library)}</h4>{(questions[item.track] || []).map((q, i) => <div className="flex items-start gap-2" key={i}><textarea aria-label={`${selectionName(item, library)} question ${i + 1}`} className={field} value={q} required maxLength={2000} onChange={e => setQuestions({ ...questions, [item.track]: questions[item.track].map((v, n) => n === i ? e.target.value : v) })} /><button type="button" className={btn} onClick={() => setQuestions({ ...questions, [item.track]: questions[item.track].filter((_, n) => n !== i) })}>Remove</button></div>)}<button type="button" className={btn} onClick={() => setQuestions({ ...questions, [item.track]: [...(questions[item.track] || []), ''] })}>Add question</button></section>)}
    </>}
    {error && <p role="alert" className="text-rose-600">{error}</p>}
    {generating && <p role="status">Preparing questions for review…</p>}
  </fieldset>;
}
