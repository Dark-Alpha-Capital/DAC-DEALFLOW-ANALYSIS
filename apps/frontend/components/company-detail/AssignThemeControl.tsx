
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "@/lib/navigation-shim";
import { toast } from "sonner";
import { useTRPC } from "@/trpc/client";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AssignThemeControlProps {
  companyId: string;
  currentThemeId: string | null;
}

export function AssignThemeControl({
  companyId,
  currentThemeId,
}: AssignThemeControlProps) {
  const trpc = useTRPC();
  const router = useRouter();
  const [selectedThemeId, setSelectedThemeId] = useState(
    currentThemeId ?? "none",
  );

  const { data: themes = [], isLoading } = useQuery(
    trpc.themes.listForSelect.queryOptions(),
  );

  const { mutate: assignTheme, isPending } = useMutation(
    trpc.companies.assignTheme.mutationOptions({
      onSuccess: () => {
        toast.success("Theme updated");
        void router.invalidate();
      },
      onError: (error) => {
        toast.error(error.message || "Failed to update theme");
      },
    }),
  );

  const hasChanges = (currentThemeId ?? "none") !== selectedThemeId;

  const handleSave = () => {
    assignTheme({
      companyId,
      themeId: selectedThemeId === "none" ? undefined : selectedThemeId,
    });
  };

  return (
    <div className="border-border mt-2 rounded-md border p-3">
      <p className="text-foreground text-xs font-medium">Assign theme</p>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
        <Select
          value={selectedThemeId}
          onValueChange={setSelectedThemeId}
          disabled={isLoading || isPending}
        >
          <SelectTrigger className="w-full sm:w-[260px]">
            <SelectValue placeholder="Select theme" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Unassigned</SelectItem>
            {themes.map((theme) => (
              <SelectItem key={theme.id} value={theme.id}>
                {theme.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          size="sm"
          variant="outline"
          onClick={handleSave}
          disabled={!hasChanges || isPending}
        >
          {isPending ? "Saving..." : "Save"}
        </Button>
      </div>
    </div>
  );
}
