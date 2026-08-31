import { apiClient } from './apiClient';

export type BatchSummary = {
  id: string;
  filename: string;
  status: 'draft' | 'running' | 'completed' | 'cancelled' | string;
  total_contacts: number;
  concurrency: number;
  created_by: string;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  agent_name: string;
  completed: number;
  failed: number;
  pending: number;
};

export type BatchContact = {
  row_number: number;
  contact_name: string;
  destination: string;
  status: string;
  error?: string;
  call_status?: string;
  conversation_id?: string;
  updated_at?: string;
};

export type BatchDetails = {
  id: string;
  status: string;
  filename: string;
  agent_name: string;
  total_contacts: number;
  concurrency: number;
  counts: Record<string, number>;
  completed_contacts: number;
  progress_percent: number;
  started_at?: string;
  completed_at?: string;
  report_ready: boolean;
  contacts: BatchContact[];
};

export type BatchUploadResult = {
  id: string;
  status: string;
  accepted: number;
  rejected_count: number;
  rejected: Array<{ row: number; reason: string }>;
  daily_limit: number;
};

export const outboundBatchesApi = {
  async list() {
    return (await apiClient.get<BatchSummary[]>('/v3/outbound-batches')).data;
  },
  async get(id: string) {
    return (await apiClient.get<BatchDetails>(`/v3/outbound-batches/${id}`)).data;
  },
  async upload(data: { file: File; phoneAgentId: string; consentDeclaration: string; concurrency: number }) {
    const form = new FormData();
    form.append('file', data.file);
    form.append('phone_agent_id', data.phoneAgentId);
    form.append('consent_confirmed', 'true');
    form.append('consent_declaration', data.consentDeclaration);
    form.append('concurrency', String(data.concurrency));
    return (await apiClient.post<BatchUploadResult>('/v3/outbound-batches', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })).data;
  },
  async start(id: string) {
    return (await apiClient.post(`/v3/outbound-batches/${id}/start`)).data;
  },
  async cancel(id: string) {
    return (await apiClient.post(`/v3/outbound-batches/${id}/cancel`)).data;
  },
  async downloadReport(id: string, filename: string) {
    const response = await apiClient.get(`/v3/outbound-batches/${id}/report`, { responseType: 'blob' });
    const url = URL.createObjectURL(response.data);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename.replace(/\.[^.]+$/, '')}-call-report.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  },
};
