import { apiClient } from "./apiClient";
export type Account = {
  id: string;
  display_name: string;
  enabled: boolean;
  ready: boolean;
};
export type Template = {
  id: string;
  account_id: string;
  name: string;
  language: string;
  category: string;
  status: string;
  body: string;
  variables: string[];
  supported: boolean;
  error?: string;
  components: Array<{ type: string; example?: { body_text?: string[][] } }>;
};
export type Binding = { source: "field" | "fixed"; value: string };
export type Campaign = {
  id: string;
  name: string;
  status: string;
  template_id: string;
  mapping: Record<string, Binding>;
  total_contacts: number;
  template_name?: string;
  sent?: number;
  delivered?: number;
  read?: number;
  failed?: number;
  delivery_rate?: number | null;
  read_rate?: number | null;
  counts: Record<string, number>;
  progress_percent: number;
  created_at: string;
};
export type Contact = {
  id: string;
  contact_name: string;
  destination: string;
  extra: Record<string, string>;
};
export type Message = {
  id: string;
  campaign_id?: string;
  contact_name: string;
  destination: string;
  direction: string;
  body: string;
  status: string;
  error?: string;
  created_at: string;
  updated_at: string;
};
export type Page<T> = { items: T[]; total: number; fields?: string[] };
export type MessagePage = Page<Message> & {
  window_closes_at?: string | null;
  window_open?: boolean;
};
export type Thread = {
  destination: string;
  contact_name: string;
  body: string;
  direction: string;
  status: string;
  last_at: string;
  message_count: number;
};
export type Analytics = {
  sent: number;
  delivered: number;
  read: number;
  failed: number;
  delivery_rate: number | null;
  read_rate: number | null;
  counts: Record<string, number>;
};
export type Preview = {
  total: number;
  valid: number;
  rejected_count: number;
  rejected: Array<{ destination: string; reason: string }>;
  previews: Array<{ contact_name: string; destination: string; body: string }>;
};
export type UploadResult = {
  total_rows: number;
  duplicate_count: number;
  invalid_count: number;
  accepted: number;
  rejected_count: number;
  rejected: Array<{ row: number; reason: string }>;
};
export type TemplateInput = {
  account_id: string;
  name: string;
  language: string;
  category: string;
  body: string;
  examples: string[];
};
const base = "/v3/whatsapp";
export const whatsappApi = {
  settings: async () =>
    (await apiClient.get<{ accounts: Account[] }>(`${base}/settings`)).data,
  templates: async (account_id: string) =>
    (
      await apiClient.get<Template[]>(`${base}/templates`, {
        params: { account_id },
      })
    ).data,
  saveTemplate: async (data: TemplateInput, id?: string) =>
    (id
      ? await apiClient.patch<Template>(`${base}/templates/${id}`, data)
      : await apiClient.post<Template>(`${base}/templates`, data)
    ).data,
  submitTemplate: async (id: string) =>
    (await apiClient.post(`${base}/templates/${id}/submit`)).data,
  deleteTemplate: async (id: string) =>
    (await apiClient.delete(`${base}/templates/${id}`)).data,
  sync: async (account_id: string) =>
    (
      await apiClient.post(`${base}/templates/sync`, null, {
        params: { account_id },
      })
    ).data,
  campaigns: async (account_id: string, offset = 0, status = "all") =>
    (
      await apiClient.get<Page<Campaign>>(`${base}/campaigns`, {
        params: { account_id, offset, status },
      })
    ).data,
  analytics: async (account_id: string) =>
    (
      await apiClient.get<Analytics>(`${base}/campaigns/analytics`, {
        params: { account_id },
      })
    ).data,
  threads: async (
    account_id: string,
    offset = 0,
    search = "",
    campaign_id?: string,
  ) =>
    (
      await apiClient.get<Page<Thread>>(`${base}/messages/threads`, {
        params: { account_id, offset, search, campaign_id },
      })
    ).data,
  campaign: async (id: string) =>
    (await apiClient.get<Campaign>(`${base}/campaigns/${id}`)).data,
  saveCampaign: async (
    data: {
      account_id: string;
      name: string;
      template_id: string;
      mapping: Record<string, Binding>;
    },
    id?: string,
  ) =>
    (id
      ? await apiClient.patch<Campaign>(`${base}/campaigns/${id}`, data)
      : await apiClient.post<Campaign>(`${base}/campaigns`, data)
    ).data,
  contacts: async (id: string, offset = 0) =>
    (
      await apiClient.get<Page<Contact>>(`${base}/campaigns/${id}/contacts`, {
        params: { offset },
      })
    ).data,
  addContacts: async (
    id: string,
    contacts: Array<{
      contact_name: string;
      destination: string;
      extra: Record<string, string>;
    }>,
  ) =>
    (
      await apiClient.post<UploadResult>(`${base}/campaigns/${id}/contacts`, {
        contacts,
      })
    ).data,
  upload: async (id: string, file: File) => {
    const form = new FormData();
    form.append("file", file);
    return (
      await apiClient.post<UploadResult>(
        `${base}/campaigns/${id}/contacts/upload`,
        form,
        { headers: { "Content-Type": "multipart/form-data" } },
      )
    ).data;
  },
  removeContact: async (id: string, contact: string) =>
    (await apiClient.delete(`${base}/campaigns/${id}/contacts/${contact}`))
      .data,
  preview: async (id: string) =>
    (await apiClient.post<Preview>(`${base}/campaigns/${id}/preview`)).data,
  start: async (id: string, consent_declaration: string) =>
    (
      await apiClient.post(`${base}/campaigns/${id}/start`, {
        consent_confirmed: true,
        consent_declaration,
      })
    ).data,
  cancel: async (id: string) =>
    (await apiClient.post(`${base}/campaigns/${id}/cancel`)).data,
  messages: async (
    account_id: string,
    offset = 0,
    destination?: string,
    campaign_id?: string,
  ) =>
    (
      await apiClient.get<MessagePage>(`${base}/messages`, {
        params: {
          account_id,
          offset,
          destination: destination || undefined,
          campaign_id,
        },
      })
    ).data,
  send: async (data: {
    account_id: string;
    template_id: string;
    destination: string;
    contact_name: string;
    variables: Record<string, string>;
    idempotency_key: string;
    consent_confirmed: true;
    consent_declaration: string;
  }) => (await apiClient.post<Message>(`${base}/messages`, data)).data,
  reply: async (data: {
    account_id: string;
    destination: string;
    contact_name: string;
    body: string;
    idempotency_key: string;
  }) => (await apiClient.post<Message>(`${base}/messages/reply`, data)).data,
  report: async (id: string) => {
    const res = await apiClient.get(`${base}/campaigns/${id}/report`, {
      responseType: "blob",
    });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement("a");
    a.href = url;
    a.download = `whatsapp-${id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  },
};
