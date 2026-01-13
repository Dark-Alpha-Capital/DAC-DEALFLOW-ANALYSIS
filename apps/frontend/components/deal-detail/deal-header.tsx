import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Edit,
  ArrowLeft,
  Eye,
  EyeOff,
  CheckCircle,
  Circle,
  Send,
  Link as LinkIcon,
} from "lucide-react";
import { Deal, DealStatus, DealType } from "db/schema";
import { DealActionsDropdown } from "./deal-actions-dropdown";
import { DealSpecificationsDialog } from "@/components/Dialogs/DealSpecificationsDialog";
import ConvertDealToCompanyDialog from "@/components/Dialogs/convert-deal-to-company-dialog";
import { cn } from "@/lib/utils";

interface DealHeaderProps {
  deal: Deal;
  uid: string;
}

function StatusIndicator({
  label,
  active,
  icon: Icon,
}: {
  label: string;
  active: boolean;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5 rounded-lg border bg-card p-3 shadow-sm">
      <Icon
        className={cn(
          "h-5 w-5",
          active ? "text-success" : "text-muted-foreground",
        )}
      />
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <Badge variant={active ? "default" : "secondary"} className="text-xs">
        {active ? "Yes" : "No"}
      </Badge>
    </div>
  );
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
      return "bg-success-muted text-success";
    case "SOLD":
      return "bg-destructive/10 text-destructive";
    case "UNDER_CONTRACT":
      return "bg-warning-muted text-warning-foreground";
    default:
      return "bg-muted text-muted-foreground";
  }
}

export function DealHeader({ deal, uid }: DealHeaderProps) {
  const {
    title,
    dealType,
    status,
    brokerage,
    companyLocation,
    industry,
    seen,
    isReviewed,
    isPublished,
    bitrixId,
    tags,
  } = deal;

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Button
        variant="ghost"
        asChild
        className="gap-2 pl-0 transition-all hover:pl-2"
      >
        <Link href="/raw-deals">
          <ArrowLeft className="h-4 w-4" />
          Back to Raw Deals
        </Link>
      </Button>

      {/* Title Section */}
      <div className="space-y-3">
        {/* Badges */}
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="font-medium">
            {getDealTypeLabel(dealType)}
          </Badge>
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

        {/* Title */}
        <h1 className="text-3xl font-bold tracking-tight">
          {title || "Untitled Deal"}
        </h1>

        {/* Subtitle */}
        {(brokerage || companyLocation || industry) && (
          <p className="text-lg text-muted-foreground">
            {[brokerage, companyLocation, industry].filter(Boolean).join(" • ")}
          </p>
        )}
      </div>

      {/* Status Indicators */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatusIndicator
          label="Seen"
          active={seen}
          icon={seen ? Eye : EyeOff}
        />
        <StatusIndicator
          label="Reviewed"
          active={isReviewed}
          icon={isReviewed ? CheckCircle : Circle}
        />
        <StatusIndicator
          label="Published"
          active={isPublished}
          icon={isPublished ? Send : Circle}
        />
        <div className="flex flex-col items-center gap-1.5 rounded-lg border bg-card p-3 shadow-sm">
          <LinkIcon
            className={cn(
              "h-5 w-5",
              bitrixId ? "text-success" : "text-muted-foreground",
            )}
          />
          <span className="text-xs font-medium text-muted-foreground">
            Bitrix
          </span>
          <Badge
            variant={bitrixId ? "default" : "secondary"}
            className="text-xs"
          >
            {bitrixId ? "Linked" : "Not Linked"}
          </Badge>
        </div>
      </div>

      {/* Tags */}
      {tags && tags.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Tags</p>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <Badge key={tag} variant="outline">
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="space-y-4">
        {/* Prominent Convert to Company Button */}
        <div className="rounded-lg border-2 border-primary/20 bg-primary/5 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="mb-1 text-sm font-semibold text-foreground">
                Ready to move forward?
              </h3>
              <p className="text-xs text-muted-foreground">
                Convert this deal to a company to begin due diligence
              </p>
            </div>
            <ConvertDealToCompanyDialog deal={deal} dealId={uid} />
          </div>
        </div>

        {/* Other Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <Button asChild>
            <Link href={`/raw-deals/${uid}/edit`}>
              <Edit className="mr-2 h-4 w-4" />
              Edit Deal
            </Link>
          </Button>
          <DealSpecificationsDialog
            dealUid={uid}
            dealStatus={status}
            dealReviewed={isReviewed}
            dealPublished={isPublished}
            dealSeen={seen}
          />
          <DealActionsDropdown deal={deal} uid={uid} />
        </div>
      </div>
    </div>
  );
}
