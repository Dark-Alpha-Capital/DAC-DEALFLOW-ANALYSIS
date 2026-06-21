import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { useTRPC } from "@/trpc/client";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DEPARTMENT_VALUES } from "@repo/enums";
import { useRouter } from "@/lib/navigation-shim";
import { loadScreenersPageData } from "@/lib/server/screeners-route-data";
import {
  ROUTE_DATA_GC_TIME_MS,
  ROUTE_DATA_STALE_TIME_MS,
} from "@/lib/route-loader-cache";
import {
  looseValidateSearch,
  screenersListLoaderDeps,
} from "@/lib/route-search";

export const Route = createFileRoute("/_app/screeners/")({
  validateSearch: (input: Record<string, unknown>) =>
    screenersListLoaderDeps(looseValidateSearch(input)),
  staleTime: ROUTE_DATA_STALE_TIME_MS,
  gcTime: ROUTE_DATA_GC_TIME_MS,
  loaderDeps: ({ search }) => search,
  head: () => ({
    meta: [{ title: "Project Screeners — Dark Alpha Capital" }],
  }),
  loader: async ({ deps }) => loadScreenersPageData({ data: deps }),
  component: ScreenersPage,
});

function ScreenersPage() {
  const trpc = useTRPC();
  const router = useRouter();
  const navigate = Route.useNavigate();
  const { department: departmentFilter } = Route.useSearch();
  const { screeners } = Route.useLoaderData();

  function setSearch(patch: Partial<{ department: string }>) {
    navigate({
      search: (prev) => ({ ...prev, ...patch }),
      replace: true,
    });
  }

  const { mutate: deleteScreener, isPending: isDeleting } = useMutation(
    trpc.screeners.delete.mutationOptions({
      onSuccess: async () => {
        toast.success("Screener deleted");
        void router.invalidate();
      },
      onError: (error) => {
        toast.error(error.message || "Failed to delete screener");
      },
    }),
  );

  return (
    <section className="block-space-mini container">
      <div className="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold md:text-4xl">Project Screeners</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Evaluation rubrics used when screening project kickoffs by department.
          </p>
        </div>
        <Button asChild size="sm">
          <Link to="/screeners/new">
            <Plus className="mr-2 size-4" />
            Add screener
          </Link>
        </Button>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Select
          value={departmentFilter || "all"}
          onValueChange={(v) => setSearch({ department: v === "all" ? "" : v })}
        >
          <SelectTrigger className="w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All departments</SelectItem>
            {DEPARTMENT_VALUES.map((dept) => (
              <SelectItem key={dept} value={dept}>
                {dept}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {screeners.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <p className="text-muted-foreground text-sm">
            {departmentFilter
              ? "No screeners found for this department."
              : "No project screeners yet. Add one per department or run the seed script."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {screeners.map((s) => (
            <div
              key={s.id}
              className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <Link
                  to="/screeners/$screenerId"
                  params={{ screenerId: s.id }}
                  className="font-medium hover:underline"
                >
                  {s.name}
                </Link>
                <div className="mt-1 flex flex-wrap gap-2">
                  <Badge variant="secondary">{s.category}</Badge>
                  {s.department ? (
                    <Badge variant="outline">{s.department}</Badge>
                  ) : null}
                </div>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" disabled={isDeleting}>
                    <Trash2 className="mr-2 size-4" />
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete screener?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Kickoffs in this department will fail screening until a new
                      screener exists.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => deleteScreener({ screenerId: s.id })}>
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
