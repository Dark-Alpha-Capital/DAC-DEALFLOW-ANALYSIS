import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTRPC } from "@/trpc/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { ChevronLeft, Loader2, RefreshCw, Save } from "lucide-react";
import { toast } from "sonner";
import { DEPARTMENT_VALUES } from "@repo/db/enums";
import {
  editProjectKickoffSchema,
  type EditProjectKickoffValues,
} from "@repo/schemas";
import DeleteProjectTrackerButton from "@/components/project-trackers/delete-project-tracker-button";
import { PROJECT_TRACKERS_INDEX_DEFAULT_SEARCH } from "@/lib/route-search";
import { useProjectKickoffScreeningPoll } from "@/hooks/use-project-kickoff-screening-poll";
import { useEffect, useState } from "react";

export const Route = createFileRoute(
  "/_protected/project-trackers/$trackerId",
)({
  head: () => ({
    meta: [{ title: "Project Detail — Dark Alpha Capital" }],
  }),
  component: ProjectTrackerDetailPage,
});

function scoreColor(score: number) {
  if (score >= 3.5) return "text-green-600";
  if (score >= 2) return "text-amber-500";
  return "text-red-500";
}

function scoreLabel(score: number) {
  if (score >= 3.5) return "Worth taking";
  if (score >= 2) return "Review needed";
  return "Not recommended";
}

function scoreBadgeClass(score: number) {
  if (score >= 3.5) return "bg-green-100 text-green-800";
  if (score >= 2) return "bg-amber-100 text-amber-800";
  return "bg-red-100 text-red-800";
}

function ScreeningPanel({
  kickoff,
  latestScreening,
  onRescreen,
  isRescreening,
}: {
  kickoff: {
    id: string;
    updatedAt: Date;
    projectName: string;
  };
  latestScreening: {
    id: string;
    status: "pending" | "running" | "completed" | "failed";
    score: number | null;
    analysis: string | null;
    workflowInstanceId: string | null;
    screenedAt: Date | null;
    createdAt: Date;
  } | null;
  onRescreen: () => void;
  isRescreening: boolean;
}) {
  const [pollJobId, setPollJobId] = useState<string | null>(null);
  const isActive =
    latestScreening?.status === "pending" ||
    latestScreening?.status === "running";

  useEffect(() => {
    if (isActive && latestScreening?.workflowInstanceId) {
      setPollJobId(latestScreening.workflowInstanceId);
    }
  }, [isActive, latestScreening?.workflowInstanceId]);

  const { progress, result, terminalState } = useProjectKickoffScreeningPoll(
    pollJobId,
    isActive,
  );

  const score =
    result?.score ?? latestScreening?.score ?? null;
  const analysis =
    result?.analysis ?? latestScreening?.analysis ?? null;
  const status =
    terminalState === "completed"
      ? "completed"
      : terminalState === "failed"
        ? "failed"
        : (latestScreening?.status ?? null);

  const scoreMayBeOutdated =
    latestScreening?.screenedAt != null &&
    kickoff.updatedAt > latestScreening.screenedAt &&
    status === "completed";

  return (
    <div className="bg-card/40 ring-border/60 rounded-xl p-4 ring-1">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-foreground text-sm font-semibold">AI Screening</h2>
        <div className="flex items-center gap-2">
          {scoreMayBeOutdated ? (
            <Badge variant="outline" className="text-xs text-amber-600">
              Score may be outdated
            </Badge>
          ) : null}
          {(status === "failed" || scoreMayBeOutdated) && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              disabled={isRescreening || isActive}
              onClick={onRescreen}
            >
              <RefreshCw
                className={cn("size-3.5", isRescreening && "animate-spin")}
              />
              Re-run screening
            </Button>
          )}
        </div>
      </div>

      {status === "completed" && score !== null ? (
        <div className="flex flex-col gap-3">
          <div className="flex items-baseline gap-2">
            <span
              className={cn(
                "tabular-nums text-5xl font-bold",
                scoreColor(score),
              )}
            >
              {score.toFixed(1)}
            </span>
            <span className="text-muted-foreground text-xl">/ 5</span>
          </div>
          <span
            className={cn(
              "inline-flex w-fit items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
              scoreBadgeClass(score),
            )}
          >
            {scoreLabel(score)}
          </span>
          {analysis ? (
            <p className="text-foreground text-sm leading-relaxed">
              {analysis}
            </p>
          ) : null}
        </div>
      ) : status === "running" || status === "pending" ? (
        <div className="text-muted-foreground flex flex-col gap-2 text-sm">
          <div className="flex items-center gap-2">
            <Loader2 className="size-4 animate-spin" />
            <span>
              {progress?.step ?? "Screening in progress…"}
              {progress?.percentage != null ? ` (${progress.percentage}%)` : ""}
            </span>
          </div>
        </div>
      ) : status === "failed" ? (
        <p className="text-destructive text-sm">
          Screening failed. Use re-run to try again.
        </p>
      ) : (
        <p className="text-muted-foreground text-sm">Not yet screened.</p>
      )}
    </div>
  );
}

function ProjectTrackerDetailPage() {
  const { trackerId } = Route.useParams();
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useQuery(
    trpc.projectTrackers.getById.queryOptions({ trackerId }),
  );

  const { mutate: rescreen, isPending: isRescreening } = useMutation(
    trpc.projectKickoffs.rescreen.mutationOptions({
      onSuccess: () => {
        toast.success("Re-screening started");
        void queryClient.invalidateQueries(
          trpc.projectTrackers.getById.queryOptions({ trackerId }),
        );
      },
      onError: (error) => {
        toast.error(error.message || "Failed to start re-screening");
      },
    }),
  );

  if (isLoading) {
    return (
      <section className="block-space-mini container">
        <div className="flex items-center gap-2 py-12 text-sm">
          <Loader2 className="text-primary size-4 animate-spin" />
          <span>Loading project…</span>
        </div>
      </section>
    );
  }

  if (isError || !data) {
    return (
      <section className="block-space-mini container">
        <p className="text-destructive py-12 text-sm">Project not found.</p>
      </section>
    );
  }

  const { tracker, kickoff, latestScreening } = data;
  const displayName = kickoff?.projectName ?? tracker.name;

  return (
    <section className="block-space-mini container max-w-3xl">
      <div className="mb-6">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="-ml-2 mb-4 gap-1.5"
        >
          <Link
            to="/project-trackers"
            search={PROJECT_TRACKERS_INDEX_DEFAULT_SEARCH}
          >
            <ChevronLeft className="size-4" />
            Back to Project Trackers
          </Link>
        </Button>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold md:text-3xl">{displayName}</h1>
            <Badge variant="outline" className="text-xs">
              Project Kickoff
            </Badge>
          </div>
          {kickoff ? (
            <DeleteProjectTrackerButton
              kickoffId={kickoff.id}
              redirectAfterDelete
            />
          ) : null}
        </div>
      </div>

      {kickoff ? (
        <div className="space-y-4">
          <ScreeningPanel
            kickoff={kickoff}
            latestScreening={latestScreening}
            isRescreening={isRescreening}
            onRescreen={() => rescreen({ kickoffId: kickoff.id })}
          />

          <EditProjectForm
            kickoff={kickoff}
            onSuccess={(rescreened) => {
              void queryClient.invalidateQueries(
                trpc.projectTrackers.getById.queryOptions({ trackerId }),
              );
              if (rescreened) {
                toast.success("Project updated — re-screening started");
              }
            }}
          />
        </div>
      ) : (
        <p className="text-muted-foreground text-sm">
          No project data linked to this tracker entry.
        </p>
      )}
    </section>
  );
}

function EditProjectForm({
  kickoff,
  onSuccess,
}: {
  kickoff: {
    id: string;
    projectName: string;
    department: string | null;
    projectOwners: string | null;
    engineeringLead: string | null;
    productDirection: string | null;
    objectives: string;
    platformEnables: string | null;
    keyDeliverables: string | null;
    risksAndBlockers: string | null;
    raciMatrix: string | null;
    timeline: string | null;
    chosenTool: string | null;
    techStack: string | null;
    definitionOfDone: string | null;
    additionalNotes: string | null;
  };
  onSuccess: (rescreened: boolean) => void;
}) {
  const trpc = useTRPC();

  const form = useForm<EditProjectKickoffValues>({
    resolver: zodResolver(editProjectKickoffSchema),
    defaultValues: {
      projectName: kickoff.projectName,
      department:
        (kickoff.department as (typeof DEPARTMENT_VALUES)[number] | null) ??
        null,
      projectOwners: kickoff.projectOwners ?? "",
      engineeringLead: kickoff.engineeringLead ?? "",
      productDirection: kickoff.productDirection ?? "",
      objectives: kickoff.objectives,
      platformEnables: kickoff.platformEnables ?? "",
      keyDeliverables: kickoff.keyDeliverables ?? "",
      risksAndBlockers: kickoff.risksAndBlockers ?? "",
      raciMatrix: kickoff.raciMatrix ?? "",
      timeline: kickoff.timeline ?? "",
      chosenTool: kickoff.chosenTool ?? "",
      techStack: kickoff.techStack ?? "",
      definitionOfDone: kickoff.definitionOfDone ?? "",
      additionalNotes: kickoff.additionalNotes ?? "",
    },
  });

  const { mutate: updateProject, isPending } = useMutation(
    trpc.projectKickoffs.update.mutationOptions({
      onSuccess: (result) => {
        if (!result.rescreened) {
          toast.success("Project updated");
        }
        onSuccess(result.rescreened);
      },
      onError: (error) => {
        toast.error(error.message || "Failed to update project");
      },
    }),
  );

  function onSubmit(values: EditProjectKickoffValues) {
    updateProject({
      kickoffId: kickoff.id,
      ...values,
      projectOwners: values.projectOwners || null,
      engineeringLead: values.engineeringLead || null,
      productDirection: values.productDirection || null,
      platformEnables: values.platformEnables || null,
      keyDeliverables: values.keyDeliverables || null,
      risksAndBlockers: values.risksAndBlockers || null,
      raciMatrix: values.raciMatrix || null,
      timeline: values.timeline || null,
      chosenTool: values.chosenTool || null,
      techStack: values.techStack || null,
      definitionOfDone: values.definitionOfDone || null,
      additionalNotes: values.additionalNotes || null,
    });
  }

  const textareaFields = [
    ["objectives", "Objectives"],
    ["productDirection", "Product direction"],
    ["platformEnables", "Platform enables"],
    ["keyDeliverables", "Key deliverables"],
    ["risksAndBlockers", "Risks & blockers"],
    ["timeline", "Timeline"],
    ["definitionOfDone", "Definition of done"],
    ["additionalNotes", "Additional notes"],
  ] as const;

  return (
    <div className="bg-card/40 ring-border/60 rounded-xl p-4 ring-1 sm:p-6">
      <h2 className="text-foreground mb-4 text-sm font-semibold">
        Edit project
      </h2>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="projectName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="department"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Department</FormLabel>
                  <Select
                    value={field.value ?? ""}
                    onValueChange={(v) => field.onChange(v === "" ? null : v)}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select department…" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {DEPARTMENT_VALUES.map((dept) => (
                        <SelectItem key={dept} value={dept}>
                          {dept}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="projectOwners"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project owners</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Comma-separated names"
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="engineeringLead"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Engineering lead</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="chosenTool"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Chosen tool</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="techStack"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tech stack</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {textareaFields.map(([name, label]) => (
            <FormField
              key={name}
              control={form.control}
              name={name}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{label}</FormLabel>
                  <FormControl>
                    <Textarea rows={3} {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          ))}

          <Button type="submit" disabled={isPending} className="gap-2">
            <Save className="size-4" />
            {isPending ? "Saving…" : "Save changes"}
          </Button>
        </form>
      </Form>
    </div>
  );
}
