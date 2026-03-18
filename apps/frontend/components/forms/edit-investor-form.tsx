"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { FieldGroup, FieldLegend, FieldSet } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import type { Investor } from "@repo/db";

const INVESTOR_TYPES = ["HNWI", "FAMILY_OFFICE", "INSTITUTION"] as const;
const INVESTOR_STATUSES = [
  "PROSPECT",
  "QUALIFIED",
  "ACTIVE",
  "INACTIVE",
] as const;
const RISK_PROFILES = [
  "CONSERVATIVE",
  "MODERATE",
  "BALANCED",
  "GROWTH",
  "AGGRESSIVE",
] as const;

const EditInvestorFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.enum(INVESTOR_TYPES),
  primaryContactName: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  geography: z.string().optional(),
  minCheckSize: z.string().optional(),
  maxCheckSize: z.string().optional(),
  sectorFocus: z.string().optional(),
  stagePreference: z.string().optional(),
  riskProfile: z.enum(RISK_PROFILES).optional(),
  status: z.enum(INVESTOR_STATUSES).optional(),
});

type EditInvestorFormSchemaType = z.infer<typeof EditInvestorFormSchema>;

export default function EditInvestorForm({ investor }: { investor: Investor }) {
  const router = useRouter();
  const trpc = useTRPC();

  const { mutate: updateInvestor, isPending } = useMutation(
    trpc.investors.update.mutationOptions({
      onSuccess: () => {
        toast.success("Investor updated successfully");
        router.push(`/investors/${investor.id}`);
      },
      onError: (error) => {
        toast.error(error.message || "Failed to update investor");
      },
    }),
  );

  const form = useForm<EditInvestorFormSchemaType>({
    resolver: zodResolver(EditInvestorFormSchema),
    defaultValues: {
      name: investor.name,
      type: investor.type,
      primaryContactName: investor.primaryContactName ?? "",
      email: investor.email ?? "",
      phone: investor.phone ?? "",
      geography: investor.geography ?? "",
      minCheckSize: investor.minCheckSize?.toString() ?? "",
      maxCheckSize: investor.maxCheckSize?.toString() ?? "",
      sectorFocus: investor.sectorFocus?.join(", ") ?? "",
      stagePreference: investor.stagePreference?.join(", ") ?? "",
      riskProfile: investor.riskProfile ?? undefined,
      status: investor.status,
    },
  });

  function onSubmit(values: EditInvestorFormSchemaType) {
    updateInvestor({
      ...values,
      id: investor.id,
      sectorFocus: values.sectorFocus
        ? values.sectorFocus.split(",").map((s) => s.trim()).filter(Boolean)
        : undefined,
      stagePreference: values.stagePreference
        ? values.stagePreference.split(",").map((s) => s.trim()).filter(Boolean)
        : undefined,
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FieldSet>
          <FieldLegend>Investor Information</FieldLegend>
          <FieldGroup className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="Investor or fund name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type *</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {INVESTOR_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t.replace(/_/g, " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="primaryContactName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Primary Contact</FormLabel>
                  <FormControl>
                    <Input placeholder="Contact name" {...field} />
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
                    <Input type="email" placeholder="email@example.com" {...field} />
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
                    <Input placeholder="+1 234 567 8900" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="geography"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Geography</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., North America" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="minCheckSize"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Min Check Size</FormLabel>
                  <FormControl>
                    <Input type="text" placeholder="e.g., 500000" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="maxCheckSize"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Max Check Size</FormLabel>
                  <FormControl>
                    <Input type="text" placeholder="e.g., 5000000" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="sectorFocus"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sector Focus (comma-separated)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Healthcare, SaaS" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="stagePreference"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Stage Preference (comma-separated)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Growth, Buyout" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="riskProfile"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Risk Profile</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value ?? ""}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select risk profile" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {RISK_PROFILES.map((r) => (
                        <SelectItem key={r} value={r}>
                          {r.replace(/_/g, " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {INVESTOR_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s.replace(/_/g, " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </FieldGroup>

          <div className="mt-6 flex gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => router.push(`/investors/${investor.id}`)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </FieldSet>
      </form>
    </Form>
  );
}
