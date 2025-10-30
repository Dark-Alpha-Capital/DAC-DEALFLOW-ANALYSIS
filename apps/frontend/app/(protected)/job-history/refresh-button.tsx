"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function RefreshButton() {
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  const handleRefresh = async () => {
    try {
      setRefreshing(true);

      // Refresh the page to refetch server data
      router.refresh();

      // Show success toast after a brief delay
      setTimeout(() => {
        toast.success("Job history refreshed");
      }, 500);
    } catch (error) {
      console.error("Error refreshing:", error);
      toast.error("Failed to refresh job history");
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <Button
      onClick={handleRefresh}
      disabled={refreshing}
      variant="outline"
      size="sm"
    >
      <RefreshCw
        className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
      />
      Refresh
    </Button>
  );
}
