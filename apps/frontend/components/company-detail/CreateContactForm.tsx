"use client";

import type { Company, Contact } from "@repo/db";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { ZodError } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { contactFormSchema, type ContactFormValues } from "@/lib/schemas";

type ContactEntity = "LEAD" | "COMPANY" | "DEAL_OPPORTUNITY";

interface CreateContactFormPropsBase {
  entityType: ContactEntity;
  entityId: string;
  triggerLabel?: string;
  emptyLabel?: string;
}

interface CreateContactFormPropsCompany {
  company: Company;
  entityType?: never;
  entityId?: never;
  triggerLabel?: string;
  emptyLabel?: string;
}

export function CreateContactForm(
  props: CreateContactFormPropsBase | CreateContactFormPropsCompany,
) {
  const entityType: ContactEntity =
    "company" in props ? "COMPANY" : props.entityType;
  const entityId: string =
    "company" in props ? props.company.id : props.entityId;
  const triggerLabel = props.triggerLabel ?? "Add contact";
  const trpc = useTRPC();
  const [open, setOpen] = useState(false);

  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    mode: "onSubmit",
    defaultValues: {
      name: "",
      title: "",
      email: "",
      phone: "",
      linkedinUrl: "",
    },
  });

  const { mutate: createContact, isPending } = useMutation(
    trpc.contacts.create.mutationOptions({
      onSuccess: (data, variables) => {
        toast.success("Contact added");
        form.reset();
        setOpen(false);
      },
      onError: (error) => {
        console.log(error);
        toast.error(error.message || "Failed to add contact");
      },
    }),
  );

  const onSubmit = (values: ContactFormValues) => {
    createContact({
      entityType,
      entityId,
      name: values.name,
      title: values.title,
      email: values.email || undefined,
      phone: values.phone,
      linkedinUrl: values.linkedinUrl || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add contact</DialogTitle>
        </DialogHeader>
        <form className="mt-4 space-y-3" onSubmit={form.handleSubmit(onSubmit)}>
          <FieldGroup className="gap-3">
            <Controller
              name="name"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Name</FieldLabel>
                  <Input
                    {...field}
                    id={field.name}
                    placeholder="Jane Doe"
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
            <Controller
              name="title"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Title</FieldLabel>
                  <Input
                    {...field}
                    id={field.name}
                    placeholder="Head of Procurement"
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
            <Controller
              name="email"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Email</FieldLabel>
                  <Input
                    {...field}
                    id={field.name}
                    type="email"
                    placeholder="jane@company.com"
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
            <Controller
              name="phone"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Phone</FieldLabel>
                  <Input
                    {...field}
                    id={field.name}
                    placeholder="+1 (555) 000-0000"
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
            <Controller
              name="linkedinUrl"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>LinkedIn URL</FieldLabel>
                  <Input
                    {...field}
                    id={field.name}
                    placeholder="https://linkedin.com/in/jane-doe"
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
          </FieldGroup>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="submit" size="sm" disabled={isPending}>
              Save
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
