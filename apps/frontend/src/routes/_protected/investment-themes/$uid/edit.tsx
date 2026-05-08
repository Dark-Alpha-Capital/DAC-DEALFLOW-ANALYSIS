import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { loadInvestmentThemeForEditData } from "@/lib/server/investment-themes-route-data";
import EditThemeForm from "@/components/forms/edit-theme-form";
import EditPageSkeleton from "@/components/skeletons/edit-page-skeleton";
import {
  ROUTE_DATA_GC_TIME_MS,
  ROUTE_DATA_STALE_TIME_MS,
} from "@/lib/route-loader-cache";

export const Route = createFileRoute(
  "/_protected/investment-themes/$uid/edit",
)({
  staleTime: ROUTE_DATA_STALE_TIME_MS,
  gcTime: ROUTE_DATA_GC_TIME_MS,
  head: () => ({
    meta: [{ title: "Edit Investment Theme — Dark Alpha Capital" }],
  }),
  loader: async ({ params }) =>
    loadInvestmentThemeForEditData({ data: { uid: params.uid } }),
  pendingComponent: EditPageSkeleton,
  component: EditThemeRoute,
});

function EditThemeRoute() {
  const { uid } = Route.useParams();
  const { theme, error } = Route.useLoaderData();

  if (error) {
    return (
      <section className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="border-border w-full max-w-md space-y-4 border-b pb-8 text-center">
          <h1 className="text-foreground text-xl font-semibold">
            Error loading theme
          </h1>
          <Button asChild>
            <Link to="/investment-themes">Back to Investment themes</Link>
          </Button>
        </div>
      </section>
    );
  }

  if (!theme) {
    return (
      <section className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="border-border w-full max-w-md space-y-4 border-b pb-8 text-center">
          <h1 className="text-foreground text-xl font-semibold">
            Theme not found
          </h1>
          <Button asChild>
            <Link to="/investment-themes">Back to Investment themes</Link>
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section className="big-container block-space min-h-screen">
      <div className="mb-6">
        <Button variant="ghost" asChild className="gap-2 pl-0">
          <Link to="/investment-themes/$uid" params={{ uid }}>
            <ArrowLeft className="h-4 w-4" />
            Back to Investment theme
          </Link>
        </Button>
        <h1 className="mt-4">Edit Investment Theme</h1>
        <p className="text-muted-foreground">
          Update investment theme details.
        </p>
      </div>
      <EditThemeForm theme={theme} />
    </section>
  );
}
