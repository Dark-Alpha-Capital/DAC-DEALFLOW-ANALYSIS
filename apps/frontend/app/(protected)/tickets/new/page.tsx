// app/(protected)/tickets/new/page.tsx

import NewTicketForm from "@/components/forms/new-ticket-form";
import { Ticket } from "@/app/types";

// Optional: if you want to push the ticket to some state in parent page
interface NewTicketPageProps {
  onAddTicket?: (ticket: Ticket) => void;
}

export const metadata = {
  title: "Create Ticket - Support Dashboard",
  description: "Create a new support ticket",
};

export default function NewTicketPage({ onAddTicket }: NewTicketPageProps) {
  return (
    <section className="big-container block-space min-h-screen">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">New Ticket</h1>
        <p className="text-muted-foreground">
          Fill out the form below to create a new ticket.
        </p>
      </div>

      <div className="max-w-3xl">
        {/* NewTicketForm is a client component */}
        <NewTicketForm onAddTicket={onAddTicket} />
      </div>
    </section>
  );
}
