import { apiClient } from "@/api/apiClient";

/* ================= TYPES ================= */

export type LeadStatus = "Qualified" | "Unqualified" | "Follow Up";
import type { Lead } from "@/types/lead.types";

interface GetLeadsResponse {
  status: string;
  data: Lead[];
  pagination: {
    total: number;
    qualified: number;
    page: number;
    limit: number;
    pages: number;
  };
}

interface GetLeadDetailsResponse {
  status: string;
  data: Lead;
}

interface UpdateLeadStatusResponse {
  status: string;
  message: string;
  data: {
    conversation_id: string;
    status: string;
  };
}

/* ================= API ================= */

const getApiVersion = (agentId?: string | null): string => {
  if (agentId && agentId.startsWith("voicedots_agent_")) {
    return "v3";
  }
  if (agentId && (agentId.startsWith("agent_") || agentId.startsWith("agenet_"))) {
    return "v1";
  }
  return "v1"; // Default to v1
};

const leadsApi = {
  getLeads: async (options?: {
    agentId?: string | null;
    startDate?: string;
    endDate?: string;
    status?: string | null;
    page?: number;
    limit?: number;
  }): Promise<{ data: Lead[]; pagination: GetLeadsResponse["pagination"] }> => {
    try {
      const version = getApiVersion(options?.agentId);
      const response = await apiClient.get<GetLeadsResponse>(
        `/${version}/leads/`,
        {
          params: {
            start_date: options?.startDate || undefined,
            end_date: options?.endDate || undefined,
            status: options?.status || undefined,
            page: options?.page || 1,
            limit: options?.limit || 50,
          },
        }
      );
      const pag = response.data.pagination as any;
      const sanitizeStr = (s: any) => {
        if (typeof s === "string") {
          const l = s.trim().toLowerCase();
          if (l === "null" || l === "none" || l === "") return undefined;
        }
        return s;
      };
      
      return {
        data: response.data.data.map((lead: any) => ({
           ...lead,
           name: sanitizeStr(lead.name),
           email: sanitizeStr(lead.email),
           phone: sanitizeStr(lead.phone),
           mobile: sanitizeStr(lead.mobile),
           summary: sanitizeStr(lead.summary),
           business_description: sanitizeStr(lead.business_description),
        })),
        pagination: {
          total: pag.total_count ?? pag.total ?? 0,
          qualified: pag.qualified_count ?? pag.qualified ?? 0,
          page: pag.current_page ?? pag.page ?? 1,
          limit: pag.limit ?? 50,
          pages: pag.total_pages ?? pag.pages ?? 0,
        },
      };
    } catch (error) {
      console.error("Error fetching leads:", error);
      throw error;
    }
  },

  getLeadDetails: async (
    conversationId: string,
    agentId?: string | null
  ): Promise<Lead> => {
    try {
      const version = getApiVersion(agentId);
      const response =
        await apiClient.get<GetLeadDetailsResponse>(
          `/${version}/leads/${conversationId}`
        );
      const lead = response.data.data as any;
      const sanitizeStr = (s: any) => {
        if (typeof s === "string") {
          const l = s.trim().toLowerCase();
          if (l === "null" || l === "none" || l === "") return undefined;
        }
        return s;
      };

      return {
         ...lead,
         name: sanitizeStr(lead.name),
         email: sanitizeStr(lead.email),
         phone: sanitizeStr(lead.phone),
         mobile: sanitizeStr(lead.mobile),
         summary: sanitizeStr(lead.summary),
         business_description: sanitizeStr(lead.business_description),
      };
    } catch (error) {
      console.error(
        `Error fetching lead ${conversationId}:`,
        error
      );
      throw error;
    }
  },

  updateLeadStatus: async (
    conversationId: string,
    status: LeadStatus,
    agentId?: string | null
  ): Promise<void> => {
    try {
      const version = getApiVersion(agentId);
      await apiClient.patch<UpdateLeadStatusResponse>(
        `/${version}/leads/${conversationId}/status`,
        { status }
      );
    } catch (error) {
      console.error(
        `Error updating status for lead ${conversationId}:`,
        error
      );
      throw error;
    }
  },

  deleteLead: async (
    conversationId: string,
    agentId?: string | null
  ): Promise<void> => {
    try {
      const version = getApiVersion(agentId);
      await apiClient.delete(`/${version}/leads/${conversationId}`);
    } catch (error) {
      console.error(
        `Error deleting lead ${conversationId}:`,
        error
      );
      throw error;
    }
  },
};

export default leadsApi;
