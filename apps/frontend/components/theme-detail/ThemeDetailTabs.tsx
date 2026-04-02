
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ThemeOverviewTab } from "./ThemeOverviewTab";
import { ThemeThesisTab } from "./ThemeThesisTab";
import { ThemeIndustryIntelligenceTab } from "./ThemeIndustryIntelligenceTab";
import { ThemeCoverageTab } from "./ThemeCoverageTab";
import { ThemePerformanceTab } from "./ThemePerformanceTab";
import type { ThemeDetailTabProps } from "./types";

export default function ThemeDetailTabs(props: ThemeDetailTabProps) {
  return (
    <Tabs defaultValue="overview" className="w-full space-y-6">
      <TabsList className="w-full justify-start overflow-x-auto">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="thesis">Thesis</TabsTrigger>
        <TabsTrigger value="industry-intelligence">
          Industry intelligence
        </TabsTrigger>
        <TabsTrigger value="coverage">Coverage</TabsTrigger>
        <TabsTrigger value="performance">Performance</TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="space-y-6">
        <ThemeOverviewTab {...props} />
      </TabsContent>

      <TabsContent value="thesis" className="space-y-6">
        <ThemeThesisTab {...props} />
      </TabsContent>

      <TabsContent value="industry-intelligence" className="space-y-6">
        <ThemeIndustryIntelligenceTab {...props} />
      </TabsContent>

      <TabsContent value="coverage" className="space-y-3">
        <ThemeCoverageTab {...props} />
      </TabsContent>

      <TabsContent value="performance" className="space-y-6">
        <ThemePerformanceTab {...props} />
      </TabsContent>
    </Tabs>
  );
}
