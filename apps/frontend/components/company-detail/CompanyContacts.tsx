"use client";

import type { Company } from "db";
import type { Contact } from "db/schema";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { toast } from "sonner";

interface CompanyContactsProps {
  company: Company;
  initialContacts: Contact[];
}

const ContactFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  title: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().optional(),
  linkedinUrl: z.string().url("Invalid URL").optional().or(z.literal("")),
  role: z.string().optional(),
});

type ContactFormValues = z.infer<typeof ContactFormSchema>;

export function CompanyContacts({
  company,
  initialContacts,
}: CompanyContactsProps) {
  const trpc = useTRPC();
  const [contacts, setContacts] = useState<Contact[]>(initialContacts);

  const form = useForm<ContactFormValues>({
    resolver: zodResolver(ContactFormSchema),
    defaultValues: {
      name: "",
      title: "",
      email: "",
      phone: "",
      linkedinUrl: "",
      role: "",
    },
  });

  const { mutate: createContact, isPending } = useMutation(
    trpc.contacts.create.mutationOptions({
      onSuccess: (data, variables) => {
        toast.success("Contact added");
        setContacts((prev) => [
          ...prev,
          {
            id: data.contactId!,
            entityType: "COMPANY",
            entityId: company.id,
            name: variables.name,
            title: variables.title || null,
            email: variables.email || null,
            phone: variables.phone || null,
            linkedinUrl: variables.linkedinUrl || null,
            role: variables.role || null,
            createdAt: new Date(),
          },
        ]);
        form.reset();
      },
      onError: (error) => {
        toast.error(error.message || "Failed to add contact");
      },
    }),
  );

  const onSubmit = (values: ContactFormValues) => {
    createContact({
      entityType: "COMPANY",
      entityId: company.id,
      name: values.name,
      title: values.title,
      email: values.email || undefined,
      phone: values.phone,
      linkedinUrl: values.linkedinUrl || undefined,
      role: values.role,
    });
  };

  return (
    <div className="border-border space-y-4 border-b pb-6">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-muted-foreground text-sm font-medium">Contacts</h2>
        <Dialog>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">
              Add contact
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add contact</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form
                className="mt-4 space-y-3"
                onSubmit={form.handleSubmit(onSubmit)}
              >
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="linkedinUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>LinkedIn URL</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="submit" size="sm" disabled={isPending}>
                    Save
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {contacts.length === 0 ? (
        <p className="text-muted-foreground text-xs">
          No contacts have been added for this company yet.
        </p>
      ) : (
        <div className="space-y-2 text-xs">
          {contacts.map((contact) => (
            <div
              key={contact.id}
              className="flex flex-col gap-0.5 rounded-md border px-3 py-2"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-foreground">
                  {contact.name}
                </span>
                {contact.role && (
                  <span className="text-muted-foreground">{contact.role}</span>
                )}
              </div>
              {(contact.title || contact.email || contact.phone) && (
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-muted-foreground">
                  {contact.title && <span>{contact.title}</span>}
                  {contact.email && <span>{contact.email}</span>}
                  {contact.phone && <span>{contact.phone}</span>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

