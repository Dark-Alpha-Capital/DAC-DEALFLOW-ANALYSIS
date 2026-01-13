"use client";

import React from "react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  DollarSign,
  Edit,
  Trash2,
  MapPin,
  Briefcase,
  Type,
  Building2,
  Percent,
  CheckCircle,
  Circle,
  Check,
  Clock,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Deal, UserRole } from "db";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  calculateEbitdaMargin,
  formatCurrency,
  formatPercent,
} from "@/lib/utils";
import { useMutation } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";

const DealCard = ({
  deal,
  className,
  showActions = true,
  showScreenButton = true,
}: {
  deal: Deal;
  className?: string;
  showActions?: boolean;
  showScreenButton?: boolean;
}) => {
  const editLink = `/raw-deals/${deal.id}/edit`;
  const detailLink = `/raw-deals/${deal.id}`;
  const screenLink = `/raw-deals/${deal.id}/screen`;

  const { toast } = useToast();
  const trpc = useTRPC();

  const { mutate: deleteDeal } = useMutation(
    trpc.deals.delete.mutationOptions({
      onSuccess: () => {
        toast({
          title: "Deal Deleted",
          description: "Deal deleted successfully",
        });
      },
      onError: (error) => {
        toast({
          title: "Error",
          description: error.message || "Failed to delete deal",
          variant: "destructive",
        });
      },
    }),
  );

  const handleDelete = () => {
    deleteDeal({ id: deal.id, dealType: deal.dealType });
  };

  return (
    <Card
      className={cn(
        "group w-full transition-all duration-300 hover:scale-[1.02] hover:shadow-xl",
        className,
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="line-clamp-2 text-lg font-bold text-foreground group-hover:text-primary">
            {deal.dealCaption}
          </CardTitle>
          {showActions && (
            <div className="flex space-x-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 hover:bg-primary/10"
                      asChild
                    >
                      <Link href={editLink}>
                        <Edit className="h-4 w-4 text-primary" />
                      </Link>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Edit Deal</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 hover:bg-destructive/10"
                      onClick={handleDelete}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Delete Deal</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="grid gap-3">
        <div className="whitespace-nowrap">
          <InfoItem
            icon={<Building2 className="h-4 w-4 text-primary" />}
            label="Brokerage"
            value={deal.brokerage}
            className="whitespace-nowrap font-semibold text-primary"
          />
          <InfoItem
            icon={<Type className="h-4 w-4 text-info" />}
            label="Status"
            value={deal.status}
            className="whitespace-nowrap"
          />

          <InfoItem
            icon={
              deal.isPublished ? (
                <CheckCircle className="h-4 w-4 text-success" />
              ) : (
                <Circle className="h-4 w-4 text-muted-foreground" />
              )
            }
            label="Published"
            value={deal.isPublished ? "Yes" : "No"}
            className="whitespace-nowrap"
          />

          <InfoItem
            icon={
              deal.isReviewed ? (
                <Check className="h-4 w-4 text-info" />
              ) : (
                <Clock className="h-4 w-4 text-warning" />
              )
            }
            label="Reviewed"
            value={deal.isReviewed ? "Yes" : "No"}
            className="whitespace-nowrap"
          />

          <InfoItem
            icon={<DollarSign className="h-4 w-4 text-success" />}
            label="Revenue"
            value={formatCurrency(deal.revenue)}
            className="whitespace-nowrap"
          />

          <InfoItem
            icon={<Type className="h-4 w-4 text-success" />}
            label="DealType"
            value={deal.dealType}
          />
          <InfoItem
            icon={<DollarSign className="h-4 w-4 text-info" />}
            label="EBITDA"
            value={formatCurrency(deal.ebitda)}
          />

          <InfoItem
            icon={<Percent className="h-4 w-4 text-info" />}
            label="EBITDA Margin"
            value={formatPercent(
              calculateEbitdaMargin(deal.ebitda, deal.revenue),
            )}
          />
          <InfoItem
            icon={<Briefcase className="h-4 w-4 text-primary" />}
            label="Industry"
            value={deal.industry}
          />
          {deal.askingPrice && (
            <InfoItem
              icon={<DollarSign className="h-4 w-4 text-warning" />}
              label="Asking Price"
              value={formatCurrency(deal.askingPrice)}
            />
          )}
          {deal.companyLocation && (
            <InfoItem
              icon={<MapPin className="h-4 w-4 text-destructive" />}
              label="Location"
              value={deal.companyLocation}
              className="flex-col items-start"
            />
          )}
        </div>
      </CardContent>
      <CardFooter className="flex flex-col gap-2 pt-3">
        <Button className="w-full bg-primary/90 hover:bg-primary" asChild>
          <Link href={detailLink}>View Details</Link>
        </Button>

        {showScreenButton && (
          <Button
            className="w-full border-primary/20 hover:bg-primary/10 hover:text-primary"
            asChild
            variant="outline"
          >
            <Link href={screenLink}>Screen Deal</Link>
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};

const InfoItem = ({
  icon,
  label,
  value,
  className,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  className?: string;
}) => (
  <div className={cn("flex items-center text-sm", className)}>
    <div className="flex items-center">
      {icon}
      <span className="ml-2 font-medium text-foreground">{label}:</span>
    </div>
    <span className="ml-1 truncate whitespace-normal break-words text-justify text-muted-foreground group-hover:text-foreground">
      {value}
    </span>
  </div>
);

export default DealCard;
