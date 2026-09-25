import { Info, Ticket as TicketIcon } from "lucide-react";

export function TicketsPage() {
    return (
        <section className="flex flex-col gap-6">
            <header>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 md:text-3xl">
                    Support Tickets
                </h1>
                <p className="mt-1 text-sm text-gray-500">
                    Manage user inquiries and reported issues
                </p>
            </header>

            <div
                role="status"
                className="flex items-start gap-3 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-4 text-sm text-indigo-800 dark:border-indigo-900 dark:bg-indigo-900/20 dark:text-indigo-300"
            >
                <Info size={18} className="mt-0.5 shrink-0" />
                <div>
                    <p className="font-semibold">Support ticketing is not enabled yet</p>
                    <p className="mt-1">
                        Tickets raised by the assistant will appear here once the support service
                        is available for your account.
                    </p>
                </div>
            </div>

            <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-6 py-12 text-center text-gray-500 dark:border-slate-700 dark:bg-slate-900 dark:text-gray-400">
                <TicketIcon className="mb-3 h-10 w-10 text-gray-300 dark:text-slate-600" />
                <p className="font-medium">Ticket management will be available here</p>
                <p className="mt-1 text-sm">This page will show tickets when support ticketing is enabled.</p>
            </div>
        </section>
    );
}
