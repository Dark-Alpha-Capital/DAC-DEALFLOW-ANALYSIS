import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useRouter } from "@/lib/navigation-shim";
import { toast } from "sonner";
import { useTRPC } from "@/trpc/client";
import type { BitrixSyncPreviewData } from "@/lib/server/bitrix-sync-preview-data";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ArrowLeft, ExternalLink } from "lucide-react";
import {
  bitrixSyncFormSchema,
  type BitrixSyncFormValues,
} from "@/lib/zod-schemas/bitrix-sync-form-schema";

type FormValues = BitrixSyncFormValues;

export function BitrixSyncForm({
  dealOpportunityId,
  preview,
  previewError,
}: {
  dealOpportunityId: string;
  preview: BitrixSyncPreviewData | null;
  previewError: string | null;
}) {
  const trpc = useTRPC();
  const router = useRouter();

  const form = useForm<FormValues>({
    resolver: zodResolver(bitrixSyncFormSchema),
    defaultValues: {
      title: "",
      stageId: "",
      opportunity: 0,
      currencyId: "USD",
      comments: "",
      sourceWebsite: "",
      companyLocation: "",
      industry: "",
      brokerFirstName: "",
      brokerLastName: "",
      brokerEmail: "",
      brokerPhone: "",
      brokerLinkedIn: "",
      askingPrice: null,
      ebitda: null,
      ebitdaMargin: null,
    },
  });

  useEffect(() => {
    const d = preview?.defaultForm;
    if (!d) return;
    form.reset({
      title: d.title,
      stageId: d.stageId || "",
      opportunity: d.opportunity,
      currencyId: d.currencyId,
      comments: d.comments || "",
      sourceWebsite: d.sourceWebsite || "",
      companyLocation: d.companyLocation || "",
      industry: d.industry || "",
      brokerFirstName: d.brokerFirstName || "",
      brokerLastName: d.brokerLastName || "",
      brokerEmail: d.brokerEmail || "",
      brokerPhone: d.brokerPhone || "",
      brokerLinkedIn: d.brokerLinkedIn || "",
      askingPrice: d.askingPrice ?? null,
      ebitda: d.ebitda ?? null,
      ebitdaMargin: d.ebitdaMargin ?? null,
    });
  }, [preview, form]);

  const syncMutation = useMutation(
    trpc.dealOpportunities.syncDealOpportunityToBitrix.mutationOptions({
      onSuccess: async (data) => {
        toast.success(
          preview?.existingBitrixId
            ? "Deal updated in Bitrix24"
            : "Deal synced to Bitrix24",
        );
        void router.invalidate();
        router.push(`/deal-opportunities/${dealOpportunityId}`);
        if (data.bitrixLink) {
          window.open(data.bitrixLink, "_blank", "noopener,noreferrer");
        }
      },
      onError: (err) => {
        toast.error(err.message || "Bitrix sync failed");
      },
    }),
  );

  if (previewError || !preview) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <Button variant="ghost" asChild className="gap-2 pl-0">
          <Link
            to="/deal-opportunities/$uid"
            params={{ uid: dealOpportunityId }}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to deal
          </Link>
        </Button>
        <Alert variant="destructive">
          <AlertTitle>Could not load deal</AlertTitle>
          <AlertDescription>
            {previewError ?? "Deal opportunity not found."}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const p = preview;
  const stages = p.stages;
  const needsManualStageId = stages.length === 0;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Button variant="ghost" asChild className="gap-2 pl-0">
        <Link to="/deal-opportunities/$uid" params={{ uid: dealOpportunityId }}>
          <ArrowLeft className="h-4 w-4" />
          Back to deal
        </Link>
      </Button>

      <div>
        <h1 className="text-foreground text-2xl font-semibold tracking-tight">
          Sync to Bitrix24
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Review fields, choose the Bitrix pipeline stage, then submit. The
          webhook runs on the server only.
        </p>
      </div>

      {!p.webhookConfigured && (
        <Alert variant="destructive">
          <AlertTitle>Not configured</AlertTitle>
          <AlertDescription>
            Set <code className="text-xs">BITRIX24_WEBHOOK</code> on the server.
          </AlertDescription>
        </Alert>
      )}

      {p.webhookConfigured && !p.categoryIdConfigured && (
        <Alert variant="destructive">
          <AlertTitle>Pipeline id missing</AlertTitle>
          <AlertDescription>
            Set <code className="text-xs">BITRIX_DEAL_CATEGORY_ID</code> to your
            Bitrix deal pipeline (category) id.
          </AlertDescription>
        </Alert>
      )}

      {needsManualStageId && p.categoryIdConfigured && (
        <Alert>
          <AlertTitle>No stage list in the app</AlertTitle>
          <AlertDescription>
            Run <code className="text-xs">bun run fetch-stages</code> in{" "}
            <code className="text-xs">packages/bitrix-sync</code> (with{" "}
            <code className="text-xs">BITRIX_DEAL_CATEGORY_ID</code>) and paste
            JSON into{" "}
            <code className="text-xs">data/bitrix-deal-stages.json</code>, or
            set <code className="text-xs">BITRIX_DEAL_STAGES_JSON</code>. You
            can still enter a raw <code className="text-xs">STAGE_ID</code>{" "}
            below if you know it.
          </AlertDescription>
        </Alert>
      )}

      {(p.existingBitrixId || p.existingBitrixLink) && (
        <Alert>
          <AlertTitle>Already linked</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center gap-2">
            <span>Bitrix deal #{p.existingBitrixId}</span>
            {p.existingBitrixLink && (
              <a
                href={p.existingBitrixLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary inline-flex items-center gap-1 text-sm underline"
              >
                Open in Bitrix
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
            <span className="text-muted-foreground">
              — submitting again runs{" "}
              <code className="text-xs">crm.deal.update</code>.
            </span>
          </AlertDescription>
        </Alert>
      )}

      <Form {...form}>
        <form
          className="space-y-4"
          onSubmit={form.handleSubmit((values) =>
            syncMutation.mutate({
              dealOpportunityId,
              ...values,
              askingPrice: values.askingPrice ?? null,
              ebitda: values.ebitda ?? null,
              ebitdaMargin: values.ebitdaMargin ?? null,
            }),
          )}
        >
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
            name="stageId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Bitrix stage</FormLabel>
                {stages.length > 0 ? (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select stage" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {stages.map((s) => (
                        <SelectItem key={s.statusId} value={s.statusId}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="e.g. C7:NEW or DT31_…:UC_…"
                    />
                  </FormControl>
                )}
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="opportunity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Opportunity (revenue)</FormLabel>
                  <FormControl>
                    <Input type="number" step="any" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="askingPrice"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Asking price</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="any"
                      value={field.value ?? ""}
                      onChange={(e) => {
                        const v = e.target.value;
                        field.onChange(v === "" ? null : Number(v));
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="ebitda"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>EBITDA</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="any"
                      value={field.value ?? ""}
                      onChange={(e) => {
                        const v = e.target.value;
                        field.onChange(v === "" ? null : Number(v));
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="ebitdaMargin"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>EBITDA margin</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="any"
                      value={field.value ?? ""}
                      onChange={(e) => {
                        const v = e.target.value;
                        field.onChange(v === "" ? null : Number(v));
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="comments"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Comments / description</FormLabel>
                <FormControl>
                  <Textarea rows={4} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="sourceWebsite"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Source website</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="companyLocation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company location</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="industry"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Industry</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <p className="text-muted-foreground text-sm font-medium">Broker</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="brokerFirstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>First name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="brokerLastName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Last name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="brokerEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="brokerPhone"
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
          </div>
          <FormField
            control={form.control}
            name="brokerLinkedIn"
            render={({ field }) => (
              <FormItem>
                <FormLabel>LinkedIn</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button
            type="submit"
            disabled={
              syncMutation.isPending ||
              !p.webhookConfigured ||
              !p.categoryIdConfigured
            }
          >
            {syncMutation.isPending
              ? "Syncing…"
              : p.existingBitrixId
                ? "Update in Bitrix24"
                : "Sync to Bitrix24"}
          </Button>
        </form>
      </Form>
    </div>
  );
}
