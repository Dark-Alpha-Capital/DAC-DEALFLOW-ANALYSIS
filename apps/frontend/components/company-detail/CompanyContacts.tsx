import type { Company, Contact } from "@repo/db";
import { ContactList } from "./ContactList";
import { CreateContactForm } from "./CreateContactForm";

interface CompanyContactsProps {
  company: Company;
  initialContacts: Contact[];
}

export function CompanyContacts({
  company,
  initialContacts,
}: CompanyContactsProps) {
  return (
    <div className="border-border space-y-4 border-b pb-6">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-muted-foreground text-sm font-medium">Contacts</h2>
        <CreateContactForm company={company} />
      </div>
      <ContactList contacts={initialContacts} />
    </div>
  );
}
