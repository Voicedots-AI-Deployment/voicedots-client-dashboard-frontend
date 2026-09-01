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
  source?: string | null;
  category?: "Follow Up" | "Interested" | "General Inquiry" | "Not Interested" | "Callback Required" | "Not Assessable";
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
  status?: string;
  direction?: "inbound" | "outbound";
}

export interface GetConversationDetailsResponse {
  status: string;
  data: ConversationDetailsSummary[];
  lead: LeadDetails | null;
  start_time: number;
  end_time: number;
  duration: number;
  source?: string | null;
  category?: ConversationsListSummary["category"];
  sentiment_analysis?: SentimentAnalysis | null;
}

export interface SentimentAnalysis {
  // The bucket the model chose. The top-level `category` is what the UI shows;
  // this is the raw value it was resolved from.
  category?: ConversationsListSummary["category"];
  overall_sentiment?: string;
  interest_level?: string;
  intent?: string;
  primary_interest?: string;
  main_consideration?: string;
  objection_level?: string;
  follow_up_readiness?: string;
  summary?: string;
  key_data?: string[];
  recommended_action?: string;
}

export interface GetConversationDetailsResult {
  transcription: ConversationDetailsSummary[];
  lead: LeadDetails | null;
  start_time: string;
  end_time: string;
  duration: number;
  source?: string | null;
  category?: ConversationsListSummary["category"];
  sentiment_analysis?: SentimentAnalysis | null;
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
