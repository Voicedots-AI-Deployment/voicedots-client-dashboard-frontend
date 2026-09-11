import { apiClient } from "./apiClient";

export type EmailCapabilities = { organization: { id: string; name: string }; email_enabled: boolean; features: string[]; permissions: string[]; role: string };
export type EmailAccount = { id: string; provider: "google" | "microsoft"; email_address: string; display_name: string; status: string; last_sync_at?: string };
export type EmailThread = { id: string; subject?: string; unread_count: number; participants: string[]; latest_message_at?: string; status: string };
export type EmailThreadDetail = EmailThread & { messages: Array<{ id: string; direction: string; from: string; to: string[]; subject: string; body_text: string; body_html: string; status: string; sent_at?: string; received_at?: string }> };
export type EmailTemplate = { id: string; name: string; category: string; current_version_id: string; version?: { id: string; version: number; subject: string; body_text: string; body_html: string; variables: string[] } };

const emailApi = {
  capabilities: async () => (await apiClient.get<EmailCapabilities>("/v3/email/capabilities")).data,
  accounts: async () => (await apiClient.get<{ accounts: EmailAccount[] }>("/v3/email/accounts")).data.accounts,
  connect: async (provider: "google" | "microsoft") => (await apiClient.post<{ authorization_url: string }>(`/v3/email/oauth/${provider}/start`)).data,
  disconnect: async (id: string) => apiClient.delete(`/v3/email/accounts/${id}`),
  reconnect: async (id: string) => (await apiClient.post<{ authorization_url: string }>(`/v3/email/accounts/${id}/reconnect`)).data,
  sync: async (id: string) => (await apiClient.post(`/v3/email/accounts/${id}/sync`)).data,
  threads: async () => (await apiClient.get<{ threads: EmailThread[] }>("/v3/email/threads")).data,
  thread: async (id: string) => (await apiClient.get<EmailThreadDetail>(`/v3/email/threads/${id}`)).data,
  reply: async (id: string, payload: Record<string, unknown>) => (await apiClient.post(`/v3/email/threads/${id}/reply`, payload)).data,
  uploadAttachment: async (file: File) => { const body = new FormData(); body.append("file", file); return (await apiClient.post<{ id: string }>("/v3/email/attachments", body)).data; },
  templates: async () => (await apiClient.get<{ templates: EmailTemplate[] }>("/v3/email/templates")).data.templates,
  template: async (id: string) => (await apiClient.get<EmailTemplate>(`/v3/email/templates/${id}`)).data,
  createTemplate: async (payload: Record<string, unknown>) => (await apiClient.post<EmailTemplate>("/v3/email/templates", payload)).data,
  updateTemplate: async (id: string, payload: Record<string, unknown>) => (await apiClient.patch<EmailTemplate>(`/v3/email/templates/${id}`, payload)).data,
  duplicateTemplate: async (id: string) => (await apiClient.post<EmailTemplate>(`/v3/email/templates/${id}/duplicate`)).data,
  previewTemplate: async (payload: Record<string, unknown>) => (await apiClient.post("/v3/email/templates/preview", payload)).data,
  campaigns: async () => (await apiClient.get("/v3/email/campaigns")).data,
  campaign: async (id: string) => (await apiClient.get(`/v3/email/campaigns/${id}`)).data,
  createCampaign: async (payload: Record<string, unknown>) => (await apiClient.post("/v3/email/campaigns", payload)).data,
  addCampaignRecipients: async (id: string, recipients: Array<Record<string, unknown>>) => (await apiClient.post(`/v3/email/campaigns/${id}/recipients`, { recipients })).data,
  scheduleCampaign: async (id: string, scheduled_for: string) => (await apiClient.post(`/v3/email/campaigns/${id}/schedule`, { scheduled_for })).data,
  automations: async () => (await apiClient.get("/v3/email/automations")).data,
  send: async (payload: Record<string, unknown>) => (await apiClient.post("/v3/email/messages/send", payload)).data,
};
export default emailApi;
