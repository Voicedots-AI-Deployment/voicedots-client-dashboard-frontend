import { apiClient } from "@/api/apiClient";
import type {
  GetConversationsListResult,
  GetConversationsResponse,
  GetConversationDetailsResult,
  GetConversationDetailsResponse,
} from "@/types/conversation.types";


const getApiVersion = (agentId?: string | null): string => {
  if (agentId && agentId.startsWith("voicedots_agent_")) {
    return "v3";
  }
  if (agentId && (agentId.startsWith("agent_") || agentId.startsWith("agenet_"))) {
    return "v1";
  }
  return "v1"; // Default to v1
};

const conversationsApi = {
  /* =====================================================
     LIST CONVERSATIONS
  ===================================================== */
  getConversations: async (
    agentId?: string | null,
    cursor?: string | null,
    page: number = 1,
    limit: number = 30,
    startDate?: string,
    endDate?: string
  ): Promise<GetConversationsListResult> => {
    const version = getApiVersion(agentId);
    
    const params: Record<string, string | number | undefined> = {};
    if (agentId) params.agent_id = agentId;
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    
    if (version === "v3") {
      params.page = page;
      params.limit = limit;
    } else {
      params.cursor = cursor ?? undefined;
    }

    const response = await apiClient.get<GetConversationsResponse>(
      `/${version}/conversations/`,
      { params }
    );

    const pag = response.data.pagination as any;

    return {
      conversations: response.data.data,
      nextPage: response.data.next_page || (pag?.next_page ? String(pag.next_page) : null),
      pagination: {
        total: pag?.total_count ?? pag?.total ?? 0,
        page: pag?.current_page ?? pag?.page ?? page,
        pages: pag?.total_pages ?? pag?.pages ?? 1,
        limit: pag?.limit ?? limit
      }
    };
  },

  /* =====================================================
     CONVERSATION DETAILS
  ===================================================== */
  getConversationDetails: async (
  conversationId: string,
  agentId?: string | null
): Promise<GetConversationDetailsResult> => {
  const version = getApiVersion(agentId);

  const response =
    await apiClient.get<GetConversationDetailsResponse>(
      `/${version}/conversations/${conversationId}`
    );

  const formatIST = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      // year: "numeric",
      // month: "2-digit",
      // day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  };

  const rawLead = response.data.lead as any;
  const sanitizedLead = rawLead ? {
    ...rawLead,
    name: rawLead.name === "null" ? undefined : rawLead.name,
    email: rawLead.email === "null" ? undefined : rawLead.email,
    phone_number: rawLead.phone_number === "null" ? undefined : rawLead.phone_number,
    phone: rawLead.phone === "null" ? undefined : rawLead.phone,
    mobile: rawLead.mobile === "null" ? undefined : rawLead.mobile,
    business_desc: rawLead.business_desc === "null" ? undefined : rawLead.business_desc,
    business_description: rawLead.business_description === "null" ? undefined : rawLead.business_description,
    summary: rawLead.summary === "null" ? undefined : rawLead.summary,
  } : null;

  return {
    transcription: response.data.data,
    lead: sanitizedLead,
    start_time: formatIST(response.data.start_time),
    end_time: formatIST(response.data.end_time),
    duration: response.data.duration,
  };
},

  /* =====================================================
     CONVERSATION AUDIO
  ===================================================== */
  getConversationAudio: async (
    conversationId: string,
    agentId?: string | null
  ): Promise<Blob> => {
    const version = getApiVersion(agentId);
    const response = await apiClient.get(
      `/${version}/conversations/audio/${conversationId}`,
      {
        responseType: "blob",
      }
    );

    return response.data;
  },
};

export default conversationsApi;
