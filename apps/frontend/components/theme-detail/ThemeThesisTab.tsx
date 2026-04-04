
import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "@/lib/navigation-shim";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useTRPC } from "@/trpc/client";
import { ResponsiveFormModal } from "@/components/ui/responsive-form-modal";
import { formatDate, toLines, splitLines } from "./utils";
import type { ThemeDetailTabProps } from "./types";
import type { Thesis } from "@repo/db";

export function ThemeThesisTab({
  theme,
  activeThesis,
  thesisHistory,
}: ThemeDetailTabProps) {
  const trpc = useTRPC();
  const router = useRouter();
  const [formOpen, setFormOpen] = useState(false);

  const [thesisVersion, setThesisVersion] = useState(
    activeThesis?.version ?? "1.0",
  );
  const [thesisSummary, setThesisSummary] = useState(
    activeThesis?.summary ?? "",
  );
  const [thesisMacroDrivers, setThesisMacroDrivers] = useState(
    toLines(activeThesis?.macroDrivers?.join("\n")),
  );
  const [thesisMispricing, setThesisMispricing] = useState(
    activeThesis?.mispricingHypothesis ?? "",
  );
  const [thesisValueLevers, setThesisValueLevers] = useState(
    toLines(activeThesis?.valueCreationLevers?.join("\n")),
  );
  const [thesisExitLogic, setThesisExitLogic] = useState(
    activeThesis?.exitLogic ?? "",
  );
  const [thesisRiskFactors, setThesisRiskFactors] = useState(
    toLines(activeThesis?.riskFactors?.join("\n")),
  );

  useEffect(() => {
    if (formOpen && activeThesis) {
      setThesisVersion(activeThesis.version ?? "1.0");
      setThesisSummary(activeThesis.summary ?? "");
      setThesisMacroDrivers(toLines(activeThesis.macroDrivers?.join("\n")));
      setThesisMispricing(activeThesis.mispricingHypothesis ?? "");
      setThesisValueLevers(
        toLines(activeThesis.valueCreationLevers?.join("\n")),
      );
      setThesisExitLogic(activeThesis.exitLogic ?? "");
      setThesisRiskFactors(toLines(activeThesis.riskFactors?.join("\n")));
    }
  }, [formOpen, activeThesis]);

  const { mutate: createThesisVersion, isPending: isSavingThesis } =
    useMutation(
      trpc.themes.thesisCreateVersion.mutationOptions({
        onSuccess: () => {
          toast.success("Thesis version saved");
          setFormOpen(false);
          void router.invalidate();
        },
        onError: (error) =>
          toast.error(error.message || "Failed to save thesis"),
      }),
    );

  const handleSave = () =>
    createThesisVersion({
      themeId: theme.id,
      summary: thesisSummary,
      macroDrivers: splitLines(thesisMacroDrivers),
      mispricingHypothesis: thesisMispricing,
      valueCreationLevers: splitLines(thesisValueLevers),
      exitLogic: thesisExitLogic,
      riskFactors: splitLines(thesisRiskFactors),
      version: thesisVersion,
    });

  return (
    <div className="space-y-6">
      <ResponsiveFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        title="Create new thesis version"
        trigger={
          <Button size="sm">Create new thesis version</Button>
        }
        footer={
          <Button
            disabled={isSavingThesis}
            onClick={handleSave}
          >
            {isSavingThesis ? "Saving..." : "Save new thesis version"}
          </Button>
        }
      >
        <div className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <Input
              value={thesisVersion}
              onChange={(e) => setThesisVersion(e.target.value)}
              placeholder="Version (e.g. 1.1)"
            />
            <Input
              value={thesisExitLogic}
              onChange={(e) => setThesisExitLogic(e.target.value)}
              placeholder="Exit logic"
            />
          </div>
          <Textarea
            value={thesisSummary}
            onChange={(e) => setThesisSummary(e.target.value)}
            placeholder="Summary / investment narrative"
            className="min-h-[90px]"
          />
          <Textarea
            value={thesisMacroDrivers}
            onChange={(e) => setThesisMacroDrivers(e.target.value)}
            placeholder="Macro drivers (one per line)"
            className="min-h-[80px]"
          />
          <Textarea
            value={thesisMispricing}
            onChange={(e) => setThesisMispricing(e.target.value)}
            placeholder="Mispricing hypothesis"
            className="min-h-[80px]"
          />
          <Textarea
            value={thesisValueLevers}
            onChange={(e) => setThesisValueLevers(e.target.value)}
            placeholder="Value creation levers (one per line)"
            className="min-h-[80px]"
          />
          <Textarea
            value={thesisRiskFactors}
            onChange={(e) => setThesisRiskFactors(e.target.value)}
            placeholder="Risk factors (one per line)"
            className="min-h-[80px]"
          />
        </div>
      </ResponsiveFormModal>

      <div className="space-y-2 rounded-md border p-4">
        <h3 className="text-sm font-semibold">Thesis version history</h3>
        {thesisHistory.length === 0 ? (
          <p className="text-muted-foreground text-xs">
            No thesis versions yet.
          </p>
        ) : (
          <div className="space-y-2">
            {thesisHistory.map((item: Thesis) => (
              <div
                key={item.id}
                className="bg-muted/30 rounded border p-2 text-xs"
              >
                <p className="font-medium">
                  v{item.version} {item.isActive ? "(Active)" : ""}
                </p>
                <p className="text-muted-foreground">{item.summary}</p>
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
