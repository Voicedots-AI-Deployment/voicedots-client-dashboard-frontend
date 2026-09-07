import { apiClient } from "./apiClient";
export type Account = {
  id: string;
  display_name: string;
  enabled: boolean;
  ready: boolean;
};
export type HeaderFormat = "NONE" | "TEXT" | "IMAGE" | "VIDEO" | "DOCUMENT";
export type ButtonType = "QUICK_REPLY" | "URL" | "PHONE_NUMBER";
export type TemplateHeader = {
  format: HeaderFormat;
  text: string;
  example: string;
  handle: string;
};
export type TemplateButton = {
  type: ButtonType;
  text: string;
  url: string;
  url_example: string;
  phone_number: string;
};
/** The builder's editable shape, mirrored by the backend so a saved draft reopens. */
export type TemplateStructure = {
  header: TemplateHeader;
  body: string;
  examples: string[];
  footer: string;
  buttons: TemplateButton[];
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
  slots: string[];
  header_type: HeaderFormat;
  button_count: number;
  created_at: string;
  updated_at: string;
  structure: TemplateStructure;
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
export type MediaKind = "image" | "video" | "audio" | "document" | "sticker";
export type Media = {
  id: string;
  kind: MediaKind;
  filename: string;
  mime_type: string;
  file_size: number;
  status: "uploading" | "uploaded" | "failed";
  error?: string;
};
export type Message = {
  id: string;
  campaign_id?: string;
  contact_name: string;
  destination: string;
  direction: string;
  /** Meta's own message type, so a new kind needs no new message shape. */
  kind: string;
  media_id?: string;
  media?: Media | null;
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
  header: TemplateHeader;
  body: string;
  examples: string[];
  footer: string;
  buttons: TemplateButton[];
};
export type TemplateFilters = {
  search?: string;
  status?: string;
  category?: string;
  language?: string;
  sort?: string;
};
const base = "/v3/whatsapp";
export const whatsappApi = {
  settings: async () =>
    (await apiClient.get<{ accounts: Account[] }>(`${base}/settings`)).data,
  templates: async (account_id: string, filters: TemplateFilters = {}) =>
    (
      await apiClient.get<Template[]>(`${base}/templates`, {
        params: { account_id, ...filters },
      })
    ).data,
  duplicateTemplate: async (id: string) =>
    (await apiClient.post<Template>(`${base}/templates/${id}/duplicate`)).data,
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
  deleteCampaign: async (id: string) =>
    (await apiClient.delete(`${base}/campaigns/${id}`)).data,
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
  /** Upload first, send second: a large file must not sit inside the send request. */
  uploadMedia: async (
    account_id: string,
    file: File,
    kind = "",
    onProgress?: (percent: number) => void,
  ) => {
    const form = new FormData();
    form.append("account_id", account_id);
    form.append("file", file);
    if (kind) form.append("kind", kind);
    return (
      await apiClient.post<Media>(`${base}/media`, form, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (e) =>
          onProgress?.(e.total ? Math.round((e.loaded * 100) / e.total) : 0),
      })
    ).data;
  },
  /** Meta requires a Resumable Upload handle for template headers, not a media ID. */
  uploadTemplateHeader: async (account_id: string, file: File) => {
    const form = new FormData();
    form.append("account_id", account_id);
    form.append("file", file);
    return (
      await apiClient.post<{
        handle: string;
        kind: string;
        filename: string;
        mime_type: string;
        file_size: number;
      }>(`${base}/media/template-header`, form, {
        headers: { "Content-Type": "multipart/form-data" },
      })
    ).data;
  },
  /** The media proxy is authenticated with a bearer header, which an <img src>
   *  cannot send, so attachments are fetched as a blob and shown from an object
   *  URL. Callers must revoke the URL when the bubble unmounts. */
  fetchMedia: async (id: string) => {
    const res = await apiClient.get(`${base}/media/${id}`, {
      responseType: "blob",
    });
    return URL.createObjectURL(res.data);
  },
  downloadMedia: async (id: string, filename: string) => {
    const res = await apiClient.get(`${base}/media/${id}`, {
      responseType: "blob",
    });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename || "attachment";
    a.click();
    URL.revokeObjectURL(url);
  },
  sendMedia: async (data: {
    account_id: string;
    media_id: string;
    destination: string;
    contact_name: string;
    caption: string;
    idempotency_key: string;
  }) => (await apiClient.post<Message>(`${base}/messages/media`, data)).data,
  retryMessage: async (id: string) =>
    (await apiClient.post<Message>(`${base}/messages/${id}/retry`)).data,
  deleteMessage: async (id: string) =>
    (await apiClient.delete(`${base}/messages/${id}`)).data,
  deleteThread: async (account_id: string, destination: string) =>
    (
      await apiClient.delete(`${base}/messages/threads`, {
        params: { account_id, destination },
      })
    ).data,
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
