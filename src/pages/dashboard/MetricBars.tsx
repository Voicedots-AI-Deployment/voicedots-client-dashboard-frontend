import { displayName } from './placementDisplay';
import './dashboard-charts.css';

type Metric = { name: string; value: number | null; detail?: string };
export function MetricBars({ rows, max = 100, suffix = '', label, preserveNames = false }: { rows: Metric[]; max?: number; suffix?: string; label: string; preserveNames?: boolean }) {
  return <figure className="dashboard-bars" aria-label={label}><ul>{rows.map((row, index) => <li key={`${row.name}-${index}`}>
    <div className="dashboard-bar-heading"><span title={preserveNames ? row.name : displayName(row.name)}>{preserveNames ? row.name : displayName(row.name)}</span><strong>{row.value == null ? 'Not measured' : `${row.value}${suffix}`}</strong></div>
    <div className="dashboard-bar-track" aria-hidden="true"><span style={{ width: `${Math.max(0, Math.min(100, (row.value ?? 0) / Math.max(1, max) * 100))}%` }}/></div>
    {row.detail && <small>{row.detail}</small>}
  </li>)}</ul></figure>;
}
export const chartPalette = ['#7c3aed', '#a78bfa', '#0d9488', '#d97706', '#db2777', '#64748b'];
export const chartTooltip = { borderRadius: 12, border: '1px solid var(--dashboard-chart-border, #e5e7eb)', background: 'var(--dashboard-chart-surface, #fff)', color: 'var(--dashboard-chart-text, #263044)', fontSize: 12, boxShadow: '0 8px 24px #1e163014' };
