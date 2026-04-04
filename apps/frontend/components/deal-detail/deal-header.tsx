import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, ArrowLeft, Link as LinkIcon, CloudUpload } from "lucide-react";
import type { Deal, DealOpportunity } from "@repo/db/schema";
import { DealStatus, DealType } from "@repo/db/enums";
import { DealActionsDropdown } from "./deal-actions-dropdown";
import { DealStatusControls } from "./DealStatusControls";
import { DealPipelineSection } from "./DealPipelineSection";
import { cn } from "@/lib/utils";

const stageLabels: Record<string, string> = {
  LISTED: "Listed",
  INITIAL_REVIEW: "Initial Review",
  SCREENED: "Screened",
  MEETING_HELD: "Meeting",
  IOI_SUBMITTED: "IOI",
  LOI_SUBMITTED: "LOI",
  DILIGENCE: "Diligence",
  CLOSED: "Closed",
  DEAD: "Dead",
};

interface DealHeaderProps {
  deal: Deal;
  uid: string;
  basePath?: "deal-opportunities" | "raw-deals";
  stage?: string | null;
  currentOpportunity?: DealOpportunity | null;
}

function getDealTypeLabel(dealType: DealType): string {
  switch (dealType) {
    case "MANUAL":
      return "Manual Deal";
    case "AI_INFERRED":
      return "AI Inferred";
    case "SCRAPED":
      return "Scraped";
    default:
      return dealType;
  }
}

function getStatusColor(status: DealStatus): string {
  switch (status) {
    case "AVAILABLE":
      return "bg-primary/10 text-primary";
    case "SOLD":
      return "bg-destructive/10 text-destructive";
    case "UNDER_CONTRACT":
      return "bg-muted text-muted-foreground";
    default:
      return "bg-muted text-muted-foreground";
  }
}

export function DealHeader({
  deal,
  uid,
  basePath = "raw-deals" as const,
  stage,
  currentOpportunity,
}: DealHeaderProps) {
  const backHref =
    basePath === "deal-opportunities" ? "/deal-opportunities" : "/raw-deals";
  const backLabel =
    basePath === "deal-opportunities"
      ? "Back to Deal opportunities"
      : "Back to Raw Deals";
  const editHref =
    basePath === "deal-opportunities"
      ? `/deal-opportunities/${uid}/edit`
      : `/raw-deals/${uid}/edit`;

  const {
    dealCaption,
    dealType,
    status,
    brokerage,
    companyLocation,
    industry,
    sourceWebsite,
    reviewState,
    bitrixId,
    tags,
    firstName,
    lastName,
    createdAt,
  } = deal;

  const brokerDisplay =
    brokerage || [firstName, lastName].filter(Boolean).join(" ") || null;

  return (
    <div className="space-y-6">
      <Button
        variant="ghost"
        asChild
        className="gap-2 pl-0 transition-all hover:pl-2"
      >
        <Link to={backHref}>
          <ArrowLeft className="h-4 w-4" />
          {backLabel}
        </Link>
      </Button>

      <div className="space-y-3">
        <h1 className="text-foreground text-2xl font-semibold tracking-tight">
          {dealCaption || "Deal"}
        </h1>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="font-medium">
            {getDealTypeLabel(dealType)}
          </Badge>
          {stage && (
            <Badge variant="outline" className="font-medium">
              {stageLabels[stage] ?? stage.replace(/_/g, " ")}
            </Badge>
          )}
          <Badge className={cn("font-medium", getStatusColor(status))}>
            {status.replace("_", " ")}
          </Badge>
          {bitrixId && (
            <Badge variant="outline" className="gap-1">
              <LinkIcon className="h-3 w-3" />
              Bitrix #{bitrixId}
            </Badge>
          )}
        </div>

        <dl className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
          {sourceWebsite && (
            <div key="source">
              <dt className="text-muted-foreground inline">Source: </dt>
              <dd className="inline">
                <a
                  href={
                    sourceWebsite.startsWith("http")
                      ? sourceWebsite
                      : `https://${sourceWebsite}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  {sourceWebsite}
                </a>
              </dd>
            </div>
          )}
          {brokerDisplay && (
            <div key="broker">
              <dt className="text-muted-foreground inline">Broker: </dt>
              <dd className="inline">{brokerDisplay}</dd>
            </div>
          )}
          {createdAt && (
            <div key="created">
              <dt className="text-muted-foreground inline">Created: </dt>
              <dd className="inline">
                {new Date(createdAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </dd>
            </div>
          )}
          {(companyLocation || industry) && (
            <div key="meta">
              <dt className="text-muted-foreground inline"> </dt>
              <dd className="text-muted-foreground inline">
                {[companyLocation, industry].filter(Boolean).join(" • ")}
              </dd>
            </div>
          )}
        </dl>
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
        <div className="border-border flex flex-wrap items-center gap-3 border-b pb-4">
          <Button asChild>
            <Link to={editHref}>
              <Edit className="mr-2 h-4 w-4" />
              Edit deal opportunity
            </Link>
          </Button>
          {basePath === "deal-opportunities" && (
            <Button variant="outline" asChild>
              <Link
                to="/deal-opportunities/$uid/sync-bitrix-24"
                params={{ uid }}
              >
                <CloudUpload className="mr-2 h-4 w-4" />
                Sync to Bitrix24
              </Link>
            </Button>
          )}
          <DealActionsDropdown
            deal={deal}
            uid={uid}
            variant={
              basePath === "deal-opportunities"
                ? "deal-opportunity"
                : "raw-deal"
            }
          />
        </div>
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
