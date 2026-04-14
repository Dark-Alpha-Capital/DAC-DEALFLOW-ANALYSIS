"use client";

import { useState, useTransition } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ArrowLeft,
  Link as LinkIcon,
  Pencil,
  Trash2,
  CloudUpload,
  ExternalLink,
  Tag,
  Upload,
  Loader2,
} from "lucide-react";
import type { Deal, DealOpportunity } from "@repo/db/schema";
import { DealStatusControls } from "./DealStatusControls";
import { DealPipelineSection } from "./DealPipelineSection";
import { useTRPC } from "@/trpc/client";
import { useRouter } from "@/lib/navigation-shim";
import { DEAL_OPPORTUNITIES_INDEX_DEFAULT_SEARCH } from "@/lib/route-search";
import { toast } from "sonner";
import { exportDealToBitrix } from "@/lib/actions/upload-bitrix";
import DeleteEntityDialog from "@/components/DeleteEntityDialog";

interface DealHeaderProps {
  deal: Deal;
  uid: string;
  basePath?: "deal-opportunities" | "raw-deals";
  currentOpportunity?: DealOpportunity | null;
}

function DealHeaderToolbar({
  deal,
  uid,
  variant,
}: {
  deal: Deal;
  uid: string;
  variant: "deal-opportunity" | "raw-deal";
}) {
  const trpc = useTRPC();
  const router = useRouter();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [bitrixPending, startBitrixTransition] = useTransition();

  const { mutate: deleteOpportunity, isPending: isDeleting } = useMutation(
    trpc.dealOpportunities.deleteOpportunity.mutationOptions({
      onSuccess: () => {
        toast.success("Deal opportunity deleted");
        router.push("/deal-opportunities");
        void router.invalidate();
        setDeleteDialogOpen(false);
      },
      onError: (error) => {
        toast.error(error.message || "Failed to delete deal opportunity");
      },
    }),
  );

  const sourceHref =
    deal.sourceWebsite &&
    (deal.sourceWebsite.startsWith("http")
      ? deal.sourceWebsite
      : `https://${deal.sourceWebsite}`);

  const handlePublishToBitrix = () => {
    startBitrixTransition(async () => {
      try {
        await exportDealToBitrix({ data: deal });
        toast.success("Successfully published deal to Bitrix");
      } catch (error) {
        console.error(error);
        toast.error("Error publishing deal to Bitrix");
      }
    });
  };

  const tip = (label: string) => (
    <TooltipContent side="bottom">{label}</TooltipContent>
  );

  return (
    <>
      <TooltipProvider delayDuration={300}>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-1">
          {variant === "deal-opportunity" ? (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" asChild>
                    <Link
                      to="/deal-opportunities/$uid/edit"
                      params={{ uid }}
                      aria-label="Edit deal opportunity"
                    >
                      <Pencil className="h-4 w-4" />
                    </Link>
                  </Button>
                </TooltipTrigger>
                {tip("Edit deal opportunity")}
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" asChild>
                    <Link
                      to="/deal-opportunities/$uid/sync-bitrix-24"
                      params={{ uid }}
                      aria-label="Sync to Bitrix24"
                    >
                      <CloudUpload className="h-4 w-4" />
                    </Link>
                  </Button>
                </TooltipTrigger>
                {tip("Sync to Bitrix24")}
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    disabled={isDeleting}
                    onClick={() => setDeleteDialogOpen(true)}
                    aria-label="Delete deal opportunity"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                {tip("Delete deal opportunity")}
              </Tooltip>
            </>
          ) : (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" asChild>
                    <a href={`/raw-deals/${uid}/edit`} aria-label="Edit deal">
                      <Pencil className="h-4 w-4" />
                    </a>
                  </Button>
                </TooltipTrigger>
                {tip("Edit deal")}
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" asChild>
                    <a href={`/raw-deals/${uid}/tags`} aria-label="Add tags">
                      <Tag className="h-4 w-4" />
                    </a>
                  </Button>
                </TooltipTrigger>
                {tip("Add tags")}
              </Tooltip>

              {!deal.bitrixId && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      disabled={bitrixPending}
                      onClick={handlePublishToBitrix}
                      aria-label="Publish to Bitrix"
                    >
                      {bitrixPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  {tip(
                    bitrixPending ? "Publishing…" : "Publish deal to Bitrix",
                  )}
                </Tooltip>
              )}
            </>
          )}

          {sourceHref && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" asChild>
                  <a
                    href={sourceHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Visit listing website"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              </TooltipTrigger>
              {tip("Visit listing website")}
            </Tooltip>
          )}
        </div>
      </TooltipProvider>

      {variant === "deal-opportunity" && (
        <DeleteEntityDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          title="Delete deal opportunity?"
          description="This will permanently delete this deal opportunity. This action cannot be undone."
          onConfirm={() => deleteOpportunity({ id: uid })}
          isPending={isDeleting}
        />
      )}
    </>
  );
}

export function DealHeader({
  deal,
  uid,
  basePath = "raw-deals" as const,
  currentOpportunity,
}: DealHeaderProps) {
  const backLabel =
    basePath === "deal-opportunities"
      ? "Back to Deal opportunities"
      : "Back to Raw Deals";

  const variant =
    basePath === "deal-opportunities" ? "deal-opportunity" : "raw-deal";

  const { dealCaption, status, bitrixId, tags } = deal;

  const back =
    basePath === "deal-opportunities" ? (
      <Link
        to="/deal-opportunities"
        search={DEAL_OPPORTUNITIES_INDEX_DEFAULT_SEARCH}
        className="text-foreground hover:bg-accent inline-flex items-center gap-2 rounded-md px-0 py-2 text-sm font-medium transition-all hover:pl-2"
      >
        <ArrowLeft className="h-4 w-4" />
        {backLabel}
      </Link>
    ) : (
      <a
        href="/raw-deals"
        className="text-foreground hover:bg-accent inline-flex items-center gap-2 rounded-md px-0 py-2 text-sm font-medium transition-all hover:pl-2"
      >
        <ArrowLeft className="h-4 w-4" />
        {backLabel}
      </a>
    );

  return (
    <div className="space-y-6">
      <div>{back}</div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1 space-y-3">
          <h1 className="text-foreground text-2xl font-semibold tracking-tight">
            {dealCaption || "Deal"}
          </h1>

          <div className="flex flex-wrap items-center gap-2">
            {bitrixId && (
              <Badge variant="outline" className="gap-1">
                <LinkIcon className="h-3 w-3" />
                Bitrix #{bitrixId}
              </Badge>
            )}
          </div>
        </div>

        <DealHeaderToolbar deal={deal} uid={uid} variant={variant} />
      </div>

      {tags && tags.length > 0 && (
        <div className="space-y-2">
          <p className="text-muted-foreground text-sm font-medium">Tags</p>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <Badge key={tag} variant="outline">
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          {currentOpportunity && (
            <DealPipelineSection
              dealId={uid}
              currentOpportunity={currentOpportunity}
              compact
              inline
            />
          )}
          <DealStatusControls
            dealId={uid}
            status={status}
            reviewState={deal.reviewState}
            compact
          />
        </div>
      </div>
    </div>
  );
}
