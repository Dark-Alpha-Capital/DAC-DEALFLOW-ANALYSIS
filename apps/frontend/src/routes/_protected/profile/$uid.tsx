import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import ProfileForm from "@/components/forms/profile-form";
import { loadProfileRouteData } from "@/lib/server/profile-route-data";
import { useTRPC } from "@/trpc/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_protected/profile/$uid")({
  head: () => ({
    meta: [{ title: "User Profile — Dark Alpha Capital" }],
  }),
  loader: async ({ params }) =>
    loadProfileRouteData({ data: { uid: params.uid } }),
  component: ProfileRoute,
});

function ProfileRoute() {
  const { userWithAccounts } = Route.useLoaderData();
  const trpc = useTRPC();
  const orgQuery = useQuery(
    trpc.organizations.getActiveOrganization.queryOptions(),
  );
  const org = orgQuery.data;

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="mb-6 text-3xl font-bold">User Profile</h1>
      <div className="space-y-6">
        <div className="rounded-lg p-6 shadow">
          <ProfileForm user={userWithAccounts} />
        </div>

        <div className="rounded-lg border p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Organization</h2>
              <p className="text-muted-foreground mt-1 text-sm">
                The firm workspace you belong to.
              </p>
            </div>
            {org ? <Badge variant="secondary">{org.membershipRole}</Badge> : null}
          </div>

          {orgQuery.isLoading ? (
            <p className="text-muted-foreground mt-4 text-sm">Loading…</p>
          ) : org ? (
            <div className="mt-4 space-y-2">
              <p className="text-base font-medium">{org.name}</p>
              <p className="text-muted-foreground text-sm">
                Domain: {org.primaryEmailDomain || "—"}
              </p>
              <div className="pt-2">
                <Button asChild variant="outline" size="sm">
                  <Link to="/settings">Organization settings</Link>
                </Button>
              </div>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              <p className="text-muted-foreground text-sm">
                You are not in an organization yet.
              </p>
              <Button asChild size="sm">
                <Link to="/onboarding">Complete onboarding</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
