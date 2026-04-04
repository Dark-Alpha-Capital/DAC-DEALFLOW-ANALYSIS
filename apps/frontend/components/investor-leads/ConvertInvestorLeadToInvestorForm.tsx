
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Link } from "@tanstack/react-router";
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
import { Badge } from "@/components/ui/badge";
import { FieldGroup, FieldLegend, FieldSet } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRouter } from "@/lib/navigation-shim";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import type { InvestorLead } from "@repo/db";
import { ArrowLeft } from "lucide-react";
import {
  convertInvestorLeadToInvestorFormSchema,
  parseOptionalNumericInput,
  type ConvertInvestorLeadToInvestorFormValues,
} from "@/lib/schemas";
import { formatNumberWithCommas } from "@/lib/utils";

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

function parseCommaSeparatedValues(value: string | undefined): string[] {
  if (!value?.trim()) return [];
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function mapInferredTypeToEnum(
  inferredType: string | null | undefined,
): string {
  if (!inferredType) return "HNWI";
  const upper = inferredType.toUpperCase().replace(/-/g, "_");
  if (INVESTOR_TYPES.includes(upper as (typeof INVESTOR_TYPES)[number])) {
    return upper;
  }
  return "HNWI";
}

export function getDefaultValues(
  lead: InvestorLead,
): ConvertInvestorLeadToInvestorFormValues {
  return {
    name: lead.name?.trim() || "Unnamed",
    type: mapInferredTypeToEnum(lead.inferredType) as
      | "HNWI"
      | "FAMILY_OFFICE"
      | "INSTITUTION",
    primaryContactName: lead.name ?? "",
    email: lead.email ?? "",
    phone: lead.phone ?? "",
    geography: "",
    minCheckSize: "",
    maxCheckSize: "",
    sectorFocus: "",
    stagePreference: "",
    riskProfile: undefined,
    status: "PROSPECT",
  };
}

interface ConvertInvestorLeadToInvestorFormProps {
  lead: InvestorLead;
  onSuccess?: (data: { investorId: string }) => void;
  compact?: boolean;
}

export default function ConvertInvestorLeadToInvestorForm({
  lead,
  onSuccess,
  compact = false,
}: ConvertInvestorLeadToInvestorFormProps) {
  const router = useRouter();
  const trpc = useTRPC();

  const { mutate: convertToInvestor, isPending } = useMutation(
    trpc.investorLeads.convertToInvestor.mutationOptions({
      onSuccess: (data) => {
        toast.success("Investor lead converted to investor");
        if (onSuccess) {
          onSuccess(data);
        } else if (data.investorId) {
          void router.invalidate();
          router.push(`/investors/${data.investorId}`);
        } else {
          void router.invalidate();
        }
      },
      onError: (error) => {
        toast.error(error.message || "Failed to convert investor lead");
      },
    }),
  );

  const form = useForm<ConvertInvestorLeadToInvestorFormValues>({
    resolver: zodResolver(convertInvestorLeadToInvestorFormSchema),
    defaultValues: getDefaultValues(lead),
  });

  function onSubmit(values: ConvertInvestorLeadToInvestorFormValues) {
    convertToInvestor({
      investorLeadId: lead.id,
      name: values.name,
      type: values.type,
      primaryContactName: values.primaryContactName || undefined,
      email: values.email || undefined,
      phone: values.phone || undefined,
      geography: values.geography || undefined,
      minCheckSize: values.minCheckSize || undefined,
      maxCheckSize: values.maxCheckSize || undefined,
      sectorFocus: values.sectorFocus || undefined,
      stagePreference: values.stagePreference || undefined,
      riskProfile: values.riskProfile ?? undefined,
      status: values.status,
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FieldSet>
          <FieldLegend>Investor Information (from lead)</FieldLegend>
          <p className="text-muted-foreground mb-4 text-sm">
            Review and edit the information below before creating the investor.
          </p>
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
                  <Select onValueChange={field.onChange} value={field.value}>
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
                    <Input
                      type="email"
                      placeholder="email@example.com"
                      {...field}
                    />
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
                    <Input
                      type="text"
                      placeholder="e.g., 500,000"
                      value={
                        field.value
                          ? formatNumberWithCommas(String(field.value))
                          : ""
                      }
                      onChange={(e) => {
                        const parsed = parseOptionalNumericInput(
                          e.target.value,
                        );
                        if (parsed === null) return;
                        field.onChange(
                          parsed === undefined ? "" : String(parsed),
                        );
                      }}
                    />
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
                    <Input
                      type="text"
                      placeholder="e.g., 5,000,000"
                      value={
                        field.value
                          ? formatNumberWithCommas(String(field.value))
                          : ""
                      }
                      onChange={(e) => {
                        const parsed = parseOptionalNumericInput(
                          e.target.value,
                        );
                        if (parsed === null) return;
                        field.onChange(
                          parsed === undefined ? "" : String(parsed),
                        );
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="sectorFocus"
              render={({ field }) => {
                const values = parseCommaSeparatedValues(field.value);
                return (
                  <FormItem>
                    <FormLabel>Sector Focus (comma-separated)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Healthcare, SaaS" {...field} />
                    </FormControl>
                    {values.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {values.map((v) => (
                          <Badge
                            key={v}
                            variant="secondary"
                            className="px-1.5 py-0.5 text-[10px] font-normal"
                          >
                            {v}
                          </Badge>
                        ))}
                      </div>
                    )}
                    <FormMessage />
                  </FormItem>
                );
              }}
            />
            <FormField
              control={form.control}
              name="stagePreference"
              render={({ field }) => {
                const values = parseCommaSeparatedValues(field.value);
                return (
                  <FormItem>
                    <FormLabel>Stage Preference (comma-separated)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Growth, Buyout" {...field} />
                    </FormControl>
                    {values.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {values.map((v) => (
                          <Badge
                            key={v}
                            variant="secondary"
                            className="px-1.5 py-0.5 text-[10px] font-normal"
                          >
                            {v}
                          </Badge>
                        ))}
                      </div>
                    )}
                    <FormMessage />
                  </FormItem>
                );
              }}
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
                    value={field.value ?? "PROSPECT"}
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

          <div className="mt-6 flex flex-wrap items-center gap-3">
            {!compact && (
              <Button type="button" variant="outline" size="sm" asChild>
                <Link to={`/investor-leads/${lead.id}`} className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Back to Investor Lead
                </Link>
              </Button>
            )}
            <Button type="submit" disabled={isPending}>
              {isPending ? "Converting..." : "Convert to Investor"}
            </Button>
          </div>
        </FieldSet>
      </form>
    </Form>
  );
}
