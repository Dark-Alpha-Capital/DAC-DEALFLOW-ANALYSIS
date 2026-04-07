import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { z } from "zod";
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
} from "@/lib/zod-schemas/bitrix-sync-form-schema";

const cimScreeningBitrixFormSchema = bitrixSyncFormSchema.extend({
  runId: z.string().min(1),
  screeningComment: z.string().min(1),
});
type FormValues = z.infer<typeof cimScreeningBitrixFormSchema>;

export function CimScreeningBitrixSyncForm({
  dealOpportunityId,
  sessionId,
  runId,
  preview,
  previewError,
  screeningComment,
  questionCount,
}: {
  dealOpportunityId: string;
  sessionId: string;
  runId: string;
  preview: BitrixSyncPreviewData | null;
  previewError: string | null;
  screeningComment: string;
  questionCount: number;
}) {
  const trpc = useTRPC();
  const router = useRouter();

  const form = useForm<FormValues>({
    resolver: zodResolver(cimScreeningBitrixFormSchema),
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
      runId,
      screeningComment,
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
      runId,
      screeningComment,
    });
  }, [preview, form, runId, screeningComment]);

  const syncMutation = useMutation(
    trpc.dealOpportunities.syncScreeningRunToBitrix.mutationOptions({
      onSuccess: async (data) => {
        toast.success(
          preview?.existingBitrixId
            ? "Deal updated and run comment posted to Bitrix24"
            : "Deal synced and run comment posted to Bitrix24",
        );
        void router.invalidate();
        router.push(`/screening/${sessionId}?runId=${runId}`);
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
            to="/screening/$sessionId"
            params={{ sessionId }}
            search={{ runId }}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to screening session
          </Link>
        </Button>
        <Alert variant="destructive">
          <AlertTitle>Could not load sync preview</AlertTitle>
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
        <Link
          to="/screening/$sessionId"
          params={{ sessionId }}
          search={{ runId }}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to screening session
        </Link>
      </Button>

      <div>
        <h1 className="text-foreground text-2xl font-semibold tracking-tight">
          Sync screening run to Bitrix24
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Confirm deal fields and the compiled screening note before syncing.
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
            Enter a raw <code className="text-xs">STAGE_ID</code> if you know
            it.
          </AlertDescription>
        </Alert>
      )}

      {(p.existingBitrixId || p.existingBitrixLink) && (
        <Alert>
          <AlertTitle>Already synced to Bitrix24</AlertTitle>
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
          </AlertDescription>
        </Alert>
      )}
      {!p.existingBitrixId && (
        <Alert>
          <AlertTitle>Not synced yet</AlertTitle>
          <AlertDescription>
            This deal has no Bitrix deal ID yet. Submitting will create a new
            Bitrix deal, then post this run comment.
          </AlertDescription>
        </Alert>
      )}

      <Alert>
        <AlertTitle>Run payload preview</AlertTitle>
        <AlertDescription>
          This run includes {questionCount} screening questions and will be
          posted as a timeline comment on the Bitrix deal.
        </AlertDescription>
      </Alert>

      <Form {...form}>
        <form
          className="space-y-4"
          onSubmit={form.handleSubmit((values) =>
            syncMutation.mutate({
              dealOpportunityId,
              sessionId,
              runId: values.runId,
              title: values.title,
              stageId: values.stageId,
              opportunity: values.opportunity,
              currencyId: values.currencyId,
              comments: values.comments ?? "",
              sourceWebsite: values.sourceWebsite ?? "",
              companyLocation: values.companyLocation ?? "",
              industry: values.industry ?? "",
              brokerFirstName: values.brokerFirstName ?? "",
              brokerLastName: values.brokerLastName ?? "",
              brokerEmail: values.brokerEmail ?? "",
              brokerPhone: values.brokerPhone ?? "",
              brokerLinkedIn: values.brokerLinkedIn ?? "",
              askingPrice: values.askingPrice ?? null,
              ebitda: values.ebitda ?? null,
              ebitdaMargin: values.ebitdaMargin ?? null,
              screeningComment: values.screeningComment,
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
                      placeholder="e.g. C7:NEW or DT31_...:UC_..."
                    />
                  </FormControl>
                )}
                <FormMessage />
              </FormItem>
            )}
          />

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

          <FormField
            control={form.control}
            name="runId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Run ID</FormLabel>
                <FormControl>
                  <Input {...field} readOnly />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="screeningComment"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Run Q/A comment</FormLabel>
                <FormControl>
                  <Textarea rows={14} {...field} />
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
                ? "Update deal + post run comment"
                : "Create deal + post run comment"}
          </Button>
        </form>
      </Form>
    </div>
  );
}
