"use client";

import Link from "next/link";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Ticket } from "@/app/types"; // <-- central type

interface TicketsListProps {
  tickets: Ticket[];
}

export default function TicketsList({ tickets }: TicketsListProps) {
  if (!tickets || tickets.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-muted-foreground">
        No tickets found.
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "open":
        return "bg-green-100 text-green-700 border-green-200";
      case "in progress":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "closed":
        return "bg-gray-100 text-gray-700 border-gray-200";
      case "urgent":
        return "bg-red-100 text-red-700 border-red-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  const getPriorityText = (priority: 1 | 2 | 3) => {
    switch (priority) {
      case 1:
        return "Low";
      case 2:
        return "Medium";
      case 3:
        return "High";
    }
  };

  return (
    <ScrollArea className="h-[calc(100vh-12rem)] rounded-md border">
      <div className="grid gap-3 p-3 sm:grid-cols-2 lg:grid-cols-3">
        {tickets.map((ticket) => (
          <Link key={ticket.id} href={`/tickets/${ticket.id}`} className="group">
            <Card className="cursor-pointer border border-border bg-card transition hover:border-primary hover:shadow-md">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="line-clamp-1 text-base font-semibold">
                    {ticket.title}
                  </CardTitle>
                  <Badge
                    className={cn(
                      "border px-2 py-0.5 text-xs font-medium",
                      getStatusColor(ticket.status)
                    )}
                  >
                    {ticket.status}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="flex flex-col gap-2 text-sm text-muted-foreground">
                <div>
                  <span className="font-medium text-foreground">Assignee:</span>{" "}
                  {ticket.assignedTo?.name || "Unassigned"}
                </div>

                <div>
                  <span className="font-medium text-foreground">Priority:</span>{" "}
                  {getPriorityText(ticket.priority)}
                </div>

                <div>
                  <span className="font-medium text-foreground">Created:</span>{" "}
                  {format(new Date(ticket.createdAt), "MMM d, yyyy")}
                </div>

                {ticket.tags && ticket.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    <span className="font-medium text-foreground">Tags:</span>{" "}
                    {ticket.tags.map((tag) => (
                      <Badge key={tag} className="border px-2 py-0.5 text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </ScrollArea>
  );
}
