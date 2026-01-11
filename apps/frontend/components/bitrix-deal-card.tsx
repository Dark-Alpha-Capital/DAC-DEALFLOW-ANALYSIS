import { MapPin, DollarSign, ExternalLink } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { BitrixDealGET } from "@/app/types";
import { cn } from "@/lib/utils";

export default function BitrixDealCard({ deal }: { deal: BitrixDealGET }) {
  return (
    <div className="overflow-hidden rounded-lg border bg-card shadow-sm transition-all hover:shadow-md">
      <div className="p-5">
        <h2 className="mb-4 line-clamp-2 text-lg font-medium">
          {deal.dealCaption}
        </h2>

        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <DollarSign className="h-5 w-5" />
            <div>
              <span className="text-sm opacity-70">Revenue</span>
              <p className="font-medium">{formatCurrency(deal.revenue)}</p>
            </div>
          </div>

          {deal.askingPrice && (
            <div className="flex items-center gap-3">
              <DollarSign className="h-5 w-5" />
              <div>
                <span className="text-sm opacity-70">Asking Price</span>
                <p className="font-medium">
                  {formatCurrency(deal.askingPrice)}
                </p>
              </div>
            </div>
          )}

          {deal.companyLocation && (
            <div className="flex items-center gap-3">
              <MapPin className="h-5 w-5" />
              <span className="line-clamp-1 text-sm">
                {deal.companyLocation}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between border-t bg-muted/50 px-5 py-3">
        <span className="text-xs opacity-70">{deal.brokerage}</span>
        <a
          href={deal.sourceWebsite}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center text-xs text-primary transition-colors hover:text-primary/80"
        >
          <span>Source</span>
          <ExternalLink className="ml-1 h-3 w-3" />
        </a>
      </div>
    </div>
  );
}
