import type { Contact } from "@repo/db";
import { ContactList } from "@/components/company-detail/ContactList";
import { CreateContactForm } from "@/components/company-detail/CreateContactForm";

type ContactEntity = "LEAD" | "COMPANY" | "DEAL_OPPORTUNITY";

interface EntityContactsSectionProps {
  title: string;
  entityType: ContactEntity;
  entityId: string;
  contacts: Contact[];
  emptyLabel?: string;
}

export function EntityContactsSection({
  title,
  entityType,
  entityId,
  contacts,
  emptyLabel = "No contacts added yet.",
}: EntityContactsSectionProps) {
  return (
    <div className="border-border space-y-4 border-b pb-6">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-muted-foreground text-sm font-medium">{title}</h2>
        <CreateContactForm
          entityType={entityType}
          entityId={entityId}
          triggerLabel="Add contact"
        />
      </div>
      {contacts.length > 0 ? (
        <ContactList contacts={contacts} />
      ) : (
        <p className="text-muted-foreground text-xs">{emptyLabel}</p>
      )}
    </div>
  );
}
