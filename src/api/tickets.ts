import { apiClient } from "@/api/apiClient";
import type { Ticket } from "@/types/ticket.types";

interface GetTicketsResponse {
    status: string;
    data: Ticket[];
}

interface UpdateTicketStatusResponse {
    status: string;
    ticket_id: string;
    new_status: string;
}

const ticketsApi = {
    getTickets: async (): Promise<Ticket[]> => {
        try {
            const response = await apiClient.get<GetTicketsResponse>("/v1/ticket/");
            return response.data.data;
        } catch (error) {
            console.error("Error fetching tickets:", error);
            throw error;
        }
    },

    updateTicketStatus: async (
        ticketId: string,
        newStatus: string
    ): Promise<UpdateTicketStatusResponse> => {
        try {
            const response = await apiClient.post<UpdateTicketStatusResponse>(
                `/v1/ticket/update_ticket_status/${ticketId}?status=${encodeURIComponent(newStatus)}`
            );
            return response.data;
        } catch (error) {
            console.error(`Error updating ticket ${ticketId}:`, error);
            throw error;
        }
    },
};

export default ticketsApi;
