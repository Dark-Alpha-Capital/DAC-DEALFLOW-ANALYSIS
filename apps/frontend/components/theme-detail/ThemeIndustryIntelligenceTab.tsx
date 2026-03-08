"use client";

import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useTRPC } from "@/trpc/client";
import { ResponsiveFormModal } from "@/components/ui/responsive-form-modal";
import { formatDate } from "./utils";
import type { ThemeDetailTabProps } from "./types";
import type { IndustryIntelligence } from "@repo/db";

export function ThemeIndustryIntelligenceTab({
  theme,
  activeIndustryIntelligence,
  industryIntelligenceHistory,
}: ThemeDetailTabProps) {
  const trpc = useTRPC();
  const router = useRouter();
  const [formOpen, setFormOpen] = useState(false);

  const [intelVersion, setIntelVersion] = useState(
    activeIndustryIntelligence?.version ?? "1.0",
  );
  const [intelTAM, setIntelTAM] = useState(
    activeIndustryIntelligence?.tam?.toString() ?? "",
  );
  const [intelGrowth, setIntelGrowth] = useState(
    activeIndustryIntelligence?.growthRate?.toString() ?? "",
  );
  const [intelMargin, setIntelMargin] = useState(
    activeIndustryIntelligence?.avgEbitdaMargin?.toString() ?? "",
  );
  const [intelEntry, setIntelEntry] = useState(
    activeIndustryIntelligence?.avgEntryMultiple?.toString() ?? "",
  );
  const [intelExit, setIntelExit] = useState(
    activeIndustryIntelligence?.avgExitMultiple?.toString() ?? "",
  );
  const [intelFragmentation, setIntelFragmentation] = useState(
    activeIndustryIntelligence?.fragmentationScore?.toString() ?? "",
  );
  const [intelSponsor, setIntelSponsor] = useState(
    activeIndustryIntelligence?.sponsorPenetration?.toString() ?? "",
  );
  const [intelCyclicality, setIntelCyclicality] = useState(
    activeIndustryIntelligence?.cyclicalityScore?.toString() ?? "",
  );
  const [intelDisruption, setIntelDisruption] = useState(
    activeIndustryIntelligence?.disruptionRiskScore?.toString() ?? "",
  );
  const [intelNotes, setIntelNotes] = useState(
    activeIndustryIntelligence?.notes ?? "",
  );

  useEffect(() => {
    if (formOpen && activeIndustryIntelligence) {
      setIntelVersion(activeIndustryIntelligence.version ?? "1.0");
      setIntelTAM(activeIndustryIntelligence.tam?.toString() ?? "");
      setIntelGrowth(activeIndustryIntelligence.growthRate?.toString() ?? "");
      setIntelMargin(
        activeIndustryIntelligence.avgEbitdaMargin?.toString() ?? "",
      );
      setIntelEntry(
        activeIndustryIntelligence.avgEntryMultiple?.toString() ?? "",
      );
      setIntelExit(
        activeIndustryIntelligence.avgExitMultiple?.toString() ?? "",
      );
      setIntelFragmentation(
        activeIndustryIntelligence.fragmentationScore?.toString() ?? "",
      );
      setIntelSponsor(
        activeIndustryIntelligence.sponsorPenetration?.toString() ?? "",
      );
      setIntelCyclicality(
        activeIndustryIntelligence.cyclicalityScore?.toString() ?? "",
      );
      setIntelDisruption(
        activeIndustryIntelligence.disruptionRiskScore?.toString() ?? "",
      );
      setIntelNotes(activeIndustryIntelligence.notes ?? "");
    }
  }, [formOpen, activeIndustryIntelligence]);

  const { mutate: createIntelligenceVersion, isPending: isSavingIntelligence } =
    useMutation(
      trpc.themes.intelligenceCreateVersion.mutationOptions({
        onSuccess: () => {
          toast.success("Industry intelligence version saved");
          setFormOpen(false);
          router.refresh();
        },
        onError: (error) =>
          toast.error(error.message || "Failed to save industry intelligence"),
      }),
    );

  const handleSave = () =>
    createIntelligenceVersion({
      themeId: theme.id,
      version: intelVersion,
      tam: intelTAM || undefined,
      growthRate: intelGrowth || undefined,
      avgEbitdaMargin: intelMargin || undefined,
      avgEntryMultiple: intelEntry || undefined,
      avgExitMultiple: intelExit || undefined,
      fragmentationScore: intelFragmentation || undefined,
      sponsorPenetration: intelSponsor || undefined,
      cyclicalityScore: intelCyclicality || undefined,
      disruptionRiskScore: intelDisruption || undefined,
      notes: intelNotes,
    });

  return (
    <div className="space-y-6">
      <ResponsiveFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        title="Create new intelligence version"
        trigger={
          <Button size="sm">Create new intelligence version</Button>
        }
        footer={
          <Button
            disabled={isSavingIntelligence}
            onClick={handleSave}
          >
            {isSavingIntelligence
              ? "Saving..."
              : "Save new intelligence version"}
          </Button>
        }
      >
        <div className="space-y-3">
          <Input
            value={intelVersion}
            onChange={(e) => setIntelVersion(e.target.value)}
            placeholder="Version (e.g. 1.1)"
          />
          <div className="grid gap-3 md:grid-cols-3">
            <Input
              value={intelTAM}
              onChange={(e) => setIntelTAM(e.target.value)}
              placeholder="TAM"
            />
            <Input
              value={intelGrowth}
              onChange={(e) => setIntelGrowth(e.target.value)}
              placeholder="Growth rate (%)"
            />
            <Input
              value={intelMargin}
              onChange={(e) => setIntelMargin(e.target.value)}
              placeholder="Avg EBITDA margin (%)"
            />
            <Input
              value={intelEntry}
              onChange={(e) => setIntelEntry(e.target.value)}
              placeholder="Avg entry multiple"
            />
            <Input
              value={intelExit}
              onChange={(e) => setIntelExit(e.target.value)}
              placeholder="Avg exit multiple"
            />
            <Input
              value={intelFragmentation}
              onChange={(e) => setIntelFragmentation(e.target.value)}
              placeholder="Fragmentation score"
            />
            <Input
              value={intelSponsor}
              onChange={(e) => setIntelSponsor(e.target.value)}
              placeholder="Sponsor penetration (%)"
            />
            <Input
              value={intelCyclicality}
              onChange={(e) => setIntelCyclicality(e.target.value)}
              placeholder="Cyclicality score"
            />
            <Input
              value={intelDisruption}
              onChange={(e) => setIntelDisruption(e.target.value)}
              placeholder="Disruption risk score"
            />
          </div>
          <Textarea
            value={intelNotes}
            onChange={(e) => setIntelNotes(e.target.value)}
            placeholder="Notes"
            className="min-h-[80px]"
          />
        </div>
      </ResponsiveFormModal>

      <div className="space-y-2 rounded-md border p-4">
        <h3 className="text-sm font-semibold">
          Intelligence version history
        </h3>
        {industryIntelligenceHistory.length === 0 ? (
          <p className="text-muted-foreground text-xs">
            No intelligence versions yet.
          </p>
        ) : (
          <div className="space-y-2">
            {industryIntelligenceHistory.map((item: IndustryIntelligence) => (
              <div
                key={item.id}
                className="bg-muted/30 rounded border p-2 text-xs"
              >
                <p className="font-medium">
                  v{item.version} {item.isActive ? "(Active)" : ""}
                </p>
                <p className="text-muted-foreground">
                  Created {formatDate(item.createdAt)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
