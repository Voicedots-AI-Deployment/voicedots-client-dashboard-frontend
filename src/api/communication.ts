import { apiClient } from "./apiClient";

/**
 * Communications (email) API.
 *
 * The dashboard backend proxies `/settings/email*` straight through to the
 * email service, which resolves the client from the JWT — so these paths need
 * no agent id. Campaigns/sending are NOT proxied yet, so they're absent here.
 */

export interface EmailSettings {
  from_name: string | null;
  from_email: string | null;
  reply_to: string | null;
  signature: string | null;
  domain_status: string | null;
  dns_records: DnsRecord[];
  provider_domain_id: string | null;
  auto_reply_enabled: boolean;
  dns_provider: string | null;
  plan?: string;
  daily_limit?: number;
  sent_today?: number;
}

export interface DnsRecord {
  record?: string;
  type?: string;
  name?: string;
  value?: string;
  priority?: string | number;
  status?: string;
  [k: string]: unknown;
}

export interface UpdateEmailSettings {
  from_name?: string | null;
  from_email?: string | null;
  reply_to?: string | null;
  signature?: string | null;
  auto_reply_enabled?: boolean;
}

export interface EmailTemplateSummary {
  id: string;
  name: string;
  subject: string;
  type: string;
  updated_at: string | null;
}

export const communicationAPI = {
  getEmailSettings: async (): Promise<EmailSettings> => {
    const res = await apiClient.get<EmailSettings>("/settings/email");
    return res.data;
  },

  updateEmailSettings: async (payload: UpdateEmailSettings): Promise<EmailSettings> => {
    const res = await apiClient.post<EmailSettings>("/settings/email", payload);
    return res.data;
  },

  getDnsRecords: async (): Promise<{
    dns_records: DnsRecord[];
    domain_status: string | null;
    from_email?: string | null;
  }> => {
    const res = await apiClient.get("/settings/email/dns-records");
    return res.data;
  },

  verifyDomain: async (): Promise<Record<string, unknown>> => {
    const res = await apiClient.post("/settings/email/verify-domain", {});
    return res.data;
  },

  listTemplates: async (): Promise<EmailTemplateSummary[]> => {
    const res = await apiClient.get<{ templates: EmailTemplateSummary[] }>(
      "/settings/email/templates"
    );
    return res.data?.templates ?? [];
  },

  deleteTemplate: async (id: string): Promise<void> => {
    await apiClient.delete(`/settings/email/templates/${id}`);
  },
};

export default communicationAPI;
