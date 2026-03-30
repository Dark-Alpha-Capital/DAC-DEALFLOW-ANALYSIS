
import React, { useState, useEffect } from "react";
import ScreenerSelector from "./ScreenerSelector";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Filter } from "lucide-react";

interface Screener {
  id: string;
  name: string;
  category?: string;
  questionCount?: number;
}

interface ScreeningWrapperProps {
  dealId: string;
  dealOpportunityId: string;
  screeners: Screener[];
}

export default function ScreeningWrapper({
  dealId,
  dealOpportunityId,
  screeners,
}: ScreeningWrapperProps) {
  const [selectedScreenerId, setSelectedScreenerId] = useState<string>("");

  useEffect(() => {
    if (screeners && screeners.length > 0 && !selectedScreenerId) {
      setSelectedScreenerId(screeners[0]?.id || "");
    }
  }, [screeners, selectedScreenerId]);

  const handleScreenerSelect = (screenerId: string) => {
    setSelectedScreenerId(screenerId);
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Screening</CardTitle>
            <CardDescription>
              Use the Screenings tab on the deal page for AI qualitative
              screening and deterministic rules.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              Screener-based AI evaluation has been removed. Navigate to the
              deal detail page and open the Screenings tab.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-1">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Available Screeners
            </CardTitle>
            <CardDescription>
              Choose from our collection of screening tools
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScreenerSelector
              screeners={screeners}
              selectedScreenerId={selectedScreenerId}
              onScreenerSelect={handleScreenerSelect}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
