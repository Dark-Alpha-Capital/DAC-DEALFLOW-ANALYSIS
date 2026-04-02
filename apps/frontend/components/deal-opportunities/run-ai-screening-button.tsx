import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Sparkles } from "lucide-react";
import { Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTRPC } from "@/trpc/client";
import useCurrentUser from "@/hooks/use-current-user";
import { QUEUE_NAMES } from "@repo/redis-queue/types";

export function RunAiScreeningButton({
  dealOpportunityId,
}: {
  dealOpportunityId: string;
}) {
  const trpc = useTRPC();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useCurrentUser();
  const [open, setOpen] = useState(false);
  const [screenerId, setScreenerId] = useState("");

  const { data: screeners = [], isLoading: screenersLoading } = useQuery(
    trpc.screeners.getAll.queryOptions(),
  );

  const mutation = useMutation(
    trpc.dealOpportunities.startTemplateScreening.mutationOptions({
      onSuccess: (data) => {
        window.dispatchEvent(
          new CustomEvent("newJobs", {
            detail: [
              {
                jobId: data.jobId,
                fileName: "Deal opportunity",
                userId: user?.id ?? "",
                queueName: QUEUE_NAMES.SIM_SCREENING,
              },
            ],
          }),
        );
        void queryClient.invalidateQueries({
          queryKey: trpc.simScreening.listSessions.queryKey({ limit: 20 }),
        });
        toast.success("Template screening started");
        setScreenerId("");
        setOpen(false);
        void navigate({
          to: "/cim-screening/$sessionId",
          params: { sessionId: data.sessionId },
          search: { runId: data.runId },
        });
      },
      onError: (error) => {
        toast.error(error.message || "Failed to start screening");
      },
    }),
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="secondary">
          <Sparkles className="h-3.5 w-3.5" />
          <span className="ml-1.5">Run AI screening</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Run template screening</DialogTitle>
          <DialogDescription>
            Choose a screener template. Answers use RAG across all ingested
            documents for this deal.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Screener template</Label>
            <Select
              value={screenerId}
              onValueChange={setScreenerId}
              disabled={screenersLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select template" />
              </SelectTrigger>
              <SelectContent>
                {screeners.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name} ({s.category})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!screenerId || mutation.isPending}
              onClick={() =>
                screenerId &&
                mutation.mutate({ dealOpportunityId, screenerId })
              }
            >
              {mutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Starting…
                </>
              ) : (
                "Start screening"
              )}
            </Button>
          </div>
          <p className="text-muted-foreground text-xs leading-relaxed">
            <Link
              to="/cim-screening"
              className="text-primary underline-offset-4 hover:underline"
            >
              CIM screening
            </Link>{" "}
            lists all sessions, including deal-backed runs.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
