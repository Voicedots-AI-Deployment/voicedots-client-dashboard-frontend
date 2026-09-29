import { useRef, useState, type FormEvent } from 'react';
import { apiClient } from '@/api/apiClient';
import { collegeError } from '@/api/collegeApi';

type ImportResult = { staff_invited: number; emails_queued: number; errors_count: number; invited: { name: string; email: string }[]; errors: string[] };

export default function StaffImport({ onComplete }: { onComplete: () => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<ImportResult | null>(null);

  async function download(format: 'csv' | 'xlsx') {
    setError('');
    try {
      const response = await apiClient.get(`/v3/college/staff/template?format=${format}`, { responseType: 'blob' });
      const url = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = `staff-import-template.${format}`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (cause) { setError(collegeError(cause)); }
  }

  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const file = input.current?.files?.[0];
    if (!file || file.size > 10 * 1024 * 1024 || !/\.(csv|xlsx)$/i.test(file.name)) {
      setError('Choose a CSV or Excel (.xlsx) file up to 10 MB.');
      return;
    }
    setBusy(true); setError(''); setResult(null);
    try {
      const form = new FormData();
      form.append('file', file);
      const response = await apiClient.post<ImportResult>('/v3/college/staff/upload', form, { headers: { 'Content-Type': undefined }, timeout: 125000 });
      setResult(response.data);
      setFileName('');
      if (input.current) input.current.value = '';
      onComplete();
    } catch (cause) { setError(collegeError(cause)); }
    finally { setBusy(false); }
  }

  return <details className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
    <summary className="cursor-pointer font-semibold">Import staff from CSV or Excel</summary>
    <div className="mt-4 space-y-4">
      <p className="text-sm text-slate-500">Download a template and fill in the Staff sheet. Each row assigns one access group; repeat a staff member’s name and email to give them multiple groups. Use program and department names or codes from Academic Setup. Each staff member receives one invitation.</p>
      <div className="flex flex-wrap gap-3">
        <button type="button" className="rounded-lg border px-3 py-2 text-sm" onClick={() => void download('csv')}>Download CSV template</button>
        <button type="button" className="rounded-lg border px-3 py-2 text-sm" onClick={() => void download('xlsx')}>Download Excel template</button>
      </div>
      <form onSubmit={upload} className="flex flex-wrap items-end gap-3">
        <label className="min-w-64 flex-1 cursor-pointer rounded-xl border border-dashed border-indigo-300 bg-indigo-50/60 p-4 text-sm">
          <span className="font-semibold text-indigo-700">Staff roster file</span>
          <span className="mt-1 block text-slate-600">{fileName || 'Choose a CSV or XLSX file (up to 10 MB)'}</span>
          <input ref={input} aria-label="Staff import file" type="file" accept=".csv,.xlsx" required disabled={busy} className="sr-only" onChange={event => setFileName(event.target.files?.[0]?.name || '')} />
        </label>
        <button type="submit" className="rounded-lg bg-indigo-600 px-4 py-3 font-semibold text-white disabled:opacity-50" disabled={busy || !fileName}>{busy ? 'Importing…' : 'Import staff'}</button>
      </form>
      {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
      {result && <div role="status" className="space-y-2 text-sm">
        <p className="font-medium">{result.staff_invited} staff invited · {result.emails_queued} setup emails queued · {result.errors_count} errors</p>
        {result.invited.map(person => <p key={person.email} className="text-emerald-700">Invited {person.name} ({person.email})</p>)}
        {result.errors.map((message, index) => <p key={`${index}-${message}`} className="text-rose-700">{message}</p>)}
      </div>}
    </div>
  </details>;
}
