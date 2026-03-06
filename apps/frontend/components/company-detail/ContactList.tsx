import type { Contact } from "@repo/db";

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
      {contacts.map((contact) => (
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
        </div>
      ))}
    </div>
  );
}
