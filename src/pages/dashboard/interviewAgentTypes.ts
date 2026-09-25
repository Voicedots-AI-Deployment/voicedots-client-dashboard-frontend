export const tracks = ['hr', 'domain', 'industry', 'manager'] as const;
export const fixedPersonaKeys = ['priya_sharma', 'arjun_mehta', 'neha_kapoor', 'vikram_rao'] as const;
export const roleLabels: Record<string, string> = { hr: 'Talent Acquisition Specialist', domain: 'Senior Domain Specialist', industry: 'Practical Interviewer', manager: 'Hiring Manager' };
export type Agent = { id?: string; track: string; name?: string; role: string; intro_message: string; personality_prompt: string; tone: string; voice_id?: string };
export type AgentLibrary = { agents: Agent[]; tracks: { track: string; default_profile: Agent }[] };
export type Selection = { track: string; agent_id: string | null; profile?: Agent };
export const defaultSelection = tracks.map(track => ({ track, agent_id: null }));
export const field = 'mt-1 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm dark:border-slate-700 dark:bg-slate-900';
export const btn = 'rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold disabled:opacity-50 dark:border-slate-700';
export const panel = 'rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900';
export function agentOptions(library: AgentLibrary | null) {
  return [...(library?.tracks?.map(t => ({ ...t.default_profile, track: t.track })) || []), ...(library?.agents || [])];
}
export function selectionName(item: Selection, library: AgentLibrary | null) {
  const agent = item.profile || agentOptions(library).find(a => item.agent_id ? a.id === item.agent_id : !a.id && a.track === item.track);
  return agent?.role || roleLabels[item.track] || item.track;
}
