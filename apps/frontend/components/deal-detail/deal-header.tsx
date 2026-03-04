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
    <div className="border-border flex flex-col items-center gap-1.5 border-b py-3">
      <Icon
        className={cn(
          "h-5 w-5",
          active ? "text-foreground" : "text-muted-foreground",
        )}
      />
      <span className="text-muted-foreground text-xs font-medium">{label}</span>
      <span className="text-foreground text-xs">{active ? "Yes" : "No"}</span>
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
      return "bg-primary/10 text-primary";
    case "SOLD":
      return "bg-destructive/10 text-destructive";
    case "UNDER_CONTRACT":
      return "bg-muted text-muted-foreground";
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

        {/* Subtitle */}
        {(brokerage || companyLocation || industry) && (
          <p className="text-muted-foreground text-lg">
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
        <div className="border-border flex flex-col items-center gap-1.5 border-b py-3">
          <LinkIcon
            className={cn(
              "h-5 w-5",
              bitrixId ? "text-foreground" : "text-muted-foreground",
            )}
          />
          <span className="text-muted-foreground text-xs font-medium">
            Bitrix
          </span>
          <span className="text-foreground text-xs">
            {bitrixId ? "Linked" : "Not linked"}
          </span>
        </div>
      </div>

      {/* Tags */}
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

      {/* Action Buttons */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3 border-border border-b pb-4">
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
