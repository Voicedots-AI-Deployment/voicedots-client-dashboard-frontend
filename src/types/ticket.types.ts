export type TicketStatus = "Open" | "In Progress" | "Resolved" | "Closed" | string;

export interface Ticket {
    ticket_id: string;
    name: string;
    email: string;
    mobile: string;
    category: string;
    sub_category: string;
    description: string;
    status: TicketStatus;
}
