
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  MoreHorizontal,
  Tag,
  Upload,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import type { Deal } from "@repo/db/schema";
import { useTransition, useState } from "react";
import { exportDealToBitrix } from "@/lib/actions/upload-bitrix";
import { toast } from "sonner";

interface DealActionsDropdownProps {
  deal: Deal;
  uid: string;
}

export function DealActionsDropdown({ deal, uid }: DealActionsDropdownProps) {
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  const handleUploadToBitrix = async () => {
    startTransition(async () => {
      try {
        await exportDealToBitrix({ data: deal });
        toast.success("Successfully published deal to Bitrix");
      } catch (error) {
        console.error(error);
        toast.error("Error publishing deal to Bitrix");
      }
    });
    setOpen(false);
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon">
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">More actions</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem asChild>
          <Link to={`/raw-deals/${uid}/tags`} className="flex items-center">
            <Tag className="mr-2 h-4 w-4" />
            Add Tags
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {!deal.bitrixId && (
          <DropdownMenuItem
            onClick={handleUploadToBitrix}
            disabled={isPending}
            className="flex items-center"
          >
            {isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="mr-2 h-4 w-4" />
            )}
            {isPending ? "Publishing..." : "Publish to Bitrix"}
          </DropdownMenuItem>
        )}

        {deal.sourceWebsite && (
          <DropdownMenuItem asChild>
            <Link
              href={deal.sourceWebsite}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center"
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Visit Website
            </Link>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
