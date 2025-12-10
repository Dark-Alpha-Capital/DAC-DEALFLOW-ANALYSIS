import { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ArrowLeft } from "lucide-react";
import TicketDetailLoading from "./loading";
import ClientDate from "./ClientDate"; // Displays date in client locale

interface TicketPageProps {
  params: { id: string };
}

interface Ticket {
  id: string;
  title: string;
  status: string;
  priority: string | number;
  createdAt: Date;
  company?: { name: string };
  assignedTo?: { name: string };
  createdBy?: { name: string };
  section?: { title: string };
}

// --- Placeholder ticket detail (replace with DB call later) ---
const getTicketPlaceholder = (id: string | number): Ticket => {
  const ticketId = id?.toString() || "N/A";
  return {
    id: ticketId,
    title: `Placeholder Ticket #${ticketId}`,
    status: "open",
    priority: "Medium",
    createdAt: new Date(),
    company: { name: "Example Co." },
    assignedTo: { name: "John Doe" },
    createdBy: { name: "Admin" },
    section: { title: "Support" },
  };
};

// --- Metadata (server-safe) ---
export async function generateMetadata({ params }: TicketPageProps): Promise<Metadata> {
  const ticket = getTicketPlaceholder(params.id);
  return {
    title: ticket.title,
    description: `Details for ${ticket.title}`,
  };
}

// --- Page component ---
export default function TicketDetailPage({ params }: TicketPageProps) {
  const ticketPromise = Promise.resolve(getTicketPlaceholder(params.id));

  return (
    <Suspense fallback={<TicketDetailLoading />}>
      <TicketContent ticketPromise={ticketPromise} />
    </Suspense>
  );
}

// --- Ticket content (async) ---
async function TicketContent({ ticketPromise }: { ticketPromise: Promise<Ticket> }) {
  const ticket = await ticketPromise;

  if (!ticket) {
    return <p className="text-muted-foreground">Ticket not found.</p>;
  }

  return (
    <section className="big-container block-space min-h-screen">
      {/* Back link */}
      <div className="mb-6">
        <Link
          href="/tickets"
          className="flex items-center text-sm text-primary hover:text-primary/80"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Tickets
        </Link>
      </div>

      {/* Ticket details */}
      <div className="grid gap-4 max-w-3xl">
        <h1 className="text-2xl font-bold">{ticket.title}</h1>

        <p>
          <strong>Status:</strong> {ticket.status}
        </p>

        <p>
          <strong>Priority:</strong> {ticket.priority}
        </p>

        <p>
          <strong>Created At:</strong> <ClientDate date={ticket.createdAt} />
        </p>

        <p>
          <strong>Company:</strong> {ticket.company?.name ?? "N/A"}
        </p>

        <p>
          <strong>Assigned To:</strong> {ticket.assignedTo?.name ?? "Unassigned"}
        </p>

        <p>
          <strong>Created By:</strong> {ticket.createdBy?.name ?? "Unknown"}
        </p>

        <p>
          <strong>Section:</strong> {ticket.section?.title ?? "N/A"}
        </p>
      </div>
    </section>
  );
}
