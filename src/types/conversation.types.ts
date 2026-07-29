/* =============================
   CONVERSATIONS LIST TYPES
============================= */

export interface ConversationsListSummary {
  conversation_id: string;
  title: string;
  duration: number;
  message_count: number;
  call_status: string | boolean;
  start_time: number;
  end_time: number;
  time_format: string
}

export interface GetConversationsResponse {
  status: string;
  data: ConversationsListSummary[];
  next_page: string | null;
  pagination?: {
    total_count: number;
    current_page: number;
    total_pages: number;
    limit: number;
    next_page?: string | number | null;
  };
}

export interface GetConversationsListResult {
  conversations: ConversationsListSummary[];
  nextPage: string | null;
  pagination?: {
    total: number;
    page: number;
    pages: number;
    limit: number;
  };
}

/* =============================
   CONVERSATION DETAILS
============================= */

export interface ConversationDetailsSummary {
  role: "agent" | "user" | "assistant";
  message: string | null;
  avatar: string | null;
  timestamp: number;
  interrupted: boolean;
}

export interface LeadDetails {
  name?: string;
  email?: string;
  phone_number?: string;
  phone?: string;
  mobile?: string;
  business_desc?: string;
  business_description?: string;
  summary?: string;
}

export interface GetConversationDetailsResponse {
  status: string;
  data: ConversationDetailsSummary[];
  lead: LeadDetails | null;
  start_time: number;
  end_time: number;
  duration: number;
}

export interface GetConversationDetailsResult {
  transcription: ConversationDetailsSummary[];
  lead: LeadDetails | null;
  start_time: string;
  end_time: string;
  duration: number;
}

/* =============================
   KPI SUMMARY (CARDS)
============================= */

export interface KpiSummary {
  total_conversations: number;
  total_messages: number;

  total_cost_usd: number;
  avg_cost_per_conversation_usd: number;

  total_call_duration_secs: number;
  avg_call_duration_secs: number;
}

/* =============================
   KPI TIMESERIES (GRAPHS)
============================= */

export interface KpiTimeseriesPoint {
  date: string; // YYYY-MM-DD
  conversations: number;
  messages: number;
  cost_usd: number;
  total_call_duration_secs: number;
  avg_call_duration_secs: number;
  leads_captured?: number;
}

/* =============================
   KPI API RESPONSE
============================= */

export interface GetKpisResult {
  summary: KpiSummary;
  timeseries: KpiTimeseriesPoint[];
}
