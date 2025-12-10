"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import TicketsList from "@/components/tickets-list";
import { Ticket } from "@/app/types";
import TicketsLoadingSkeleton from "./loading";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

// Placeholder tickets
const placeholderTickets: Ticket[] = Array.from({ length: 6 }).map((_, i) => {
  const statusArray: Ticket["status"][] = [
    "open",
    "in progress",
    "closed",
    "urgent",
  ];

  const priorityArray: Ticket["priority"][] = [1, 2, 3]; // must match 1|2|3

  return {
    id: i.toString(),
    title: `Placeholder Ticket #${i + 1}`,
    status: statusArray[i % statusArray.length]!,
    priority: priorityArray[i % priorityArray.length]!,
    createdAt: new Date(),
    assignedTo: { name: `User ${i + 1}`, email: `user${i + 1}@example.com` },
    tags: [], // make sure your central Ticket type has `tags?: string[]`
  };
});

export default function TicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>(placeholderTickets);

  // Callback to add a new ticket
  const handleAddTicket = (ticket: Ticket) => {
    setTickets((prev) => [...prev, ticket]);
  };

  return (
    <main className="big-container block-space flex-1">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tickets</h1>
          <p className="text-muted-foreground">
            Manage and respond to support or internal requests.
          </p>
        </div>

        <Button asChild className="gap-2">
          <Link href="/tickets/new">
            <Plus className="h-4 w-4" />
            New Ticket
          </Link>
        </Button>
      </div>

      <Suspense fallback={<TicketsLoadingSkeleton />}>
        <TicketsList tickets={tickets} />
      </Suspense>
    </main>
  );
}
