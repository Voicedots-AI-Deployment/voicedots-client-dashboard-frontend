import { apiClient } from './apiClient';

export type BatchSummary = {
  id: string;
  filename: string;
  campaign_name: string;
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
  outcome: string;
  duration_seconds?: number;
};

export type BatchDetails = {
  id: string;
  status: string;
  filename: string;
  campaign_name: string;
  agent_name: string;
  total_contacts: number;
  concurrency: number;
  counts: Record<string, number>;
  completed_contacts: number;
  progress_percent: number;
  started_at?: string;
  completed_at?: string;
  report_ready: boolean;
  outcome_counts: Record<string, number>;
  call_status_counts: Record<string, number>;
  filtered_total: number;
  page: number;
  limit: number;
  contacts: BatchContact[];
};

export type BatchFilters = {
  outcome?: string;
  callStatus?: string;
  search?: string;
  page?: number;
  limit?: number;
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
  async get(id: string, filters: BatchFilters = {}) {
    return (await apiClient.get<BatchDetails>(`/v3/outbound-batches/${id}`, {
      params: {
        outcome: filters.outcome || undefined,
        call_status: filters.callStatus || undefined,
        search: filters.search || undefined,
        page: filters.page || 1,
        limit: filters.limit || 100,
      },
    })).data;
  },
  async upload(data: { file: File; phoneAgentId: string; campaignName: string; consentDeclaration: string; concurrency: number }) {
    const form = new FormData();
    form.append('file', data.file);
    form.append('phone_agent_id', data.phoneAgentId);
    form.append('campaign_name', data.campaignName);
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
  async downloadReport(id: string, filename: string, filters: BatchFilters = {}) {
    const response = await apiClient.get(`/v3/outbound-batches/${id}/report`, {
      responseType: 'blob',
      params: {
        outcome: filters.outcome || undefined,
        call_status: filters.callStatus || undefined,
      },
    });
    const url = URL.createObjectURL(response.data);
    const link = document.createElement('a');
    link.href = url;
    const suffix = filters.outcome || filters.callStatus
      ? `-${(filters.outcome || filters.callStatus || '').toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
      : '';
    link.download = `${filename.replace(/\.[^.]+$/, '')}${suffix}-call-report.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  },
  async downloadCampaignReport(campaignName: string, filters: BatchFilters = {}) {
    const response = await apiClient.get('/v3/outbound-batches/campaign-report', {
      responseType: 'blob',
      params: {
        campaign_name: campaignName,
        outcome: filters.outcome || undefined,
        call_status: filters.callStatus || undefined,
      },
    });
    const url = URL.createObjectURL(response.data);
    const link = document.createElement('a');
    link.href = url;
    const suffix = filters.outcome || filters.callStatus
      ? `-${(filters.outcome || filters.callStatus || '').toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
      : '';
    link.download = `${campaignName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}${suffix}-call-report.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  },
};
