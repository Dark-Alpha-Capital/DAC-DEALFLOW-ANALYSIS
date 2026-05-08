import type { Contact } from "@repo/db";
import { Link } from "@tanstack/react-router";
import { ExternalLink } from "lucide-react";
import { sanitizeHttpUrl } from "@/lib/utils";

interface ContactListProps {
  contacts: Contact[];
}

export function ContactList({ contacts }: ContactListProps) {
  if (contacts.length === 0) {
    return (
      <p className="text-muted-foreground text-xs">
        No contacts have been added for this company yet.
      </p>
    );
  }

  return (
    <div className="space-y-2 text-xs">
      {contacts.map((contact) => {
        const safeLinkedinUrl = sanitizeHttpUrl(contact.linkedinUrl);
        return (
          <div
            key={contact.id}
            className="flex flex-col gap-0.5 rounded-md border px-3 py-2"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-foreground font-medium">{contact.name}</span>
              {contact.role && (
                <span className="text-muted-foreground">{contact.role}</span>
              )}
            </div>
            {(contact.title || contact.email || contact.phone) && (
              <div className="text-muted-foreground flex flex-wrap gap-x-3 gap-y-1">
                {contact.title && <span>{contact.title}</span>}
                {contact.email && <span>{contact.email}</span>}
                {contact.phone && <span>{contact.phone}</span>}
              </div>
            )}
            {contact.linkedinUrl &&
              (safeLinkedinUrl ? (
                <a
                  href={safeLinkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary mt-1 inline-flex items-center gap-1 hover:underline"
                >
                  LinkedIn <ExternalLink className="h-3 w-3" />
                </a>
              ) : (
                <p className="text-muted-foreground mt-1 break-all">
                  LinkedIn: {contact.linkedinUrl}
                </p>
              ))}
          </div>
        );
      })}
    </div>
  );
}
