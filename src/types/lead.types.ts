export type LeadStatus = "Qualified" | "Unqualified" | "Follow Up";

export interface Lead {
  conversation_id: string;
  name?: string;
  email?: string;
  mobile?: string;
  phone?: string;
  business_description?: string;
  summary?: string;
  status: LeadStatus;
  created_at?: string;
}
