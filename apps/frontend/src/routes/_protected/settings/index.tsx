import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_protected/settings/")({
  head: () => ({
    meta: [{ title: "Organization — Dark Alpha Capital" }],
  }),
  component: OrganizationSettingsRoute,
});

function OrganizationSettingsRoute() {
  const trpc = useTRPC();
  const orgQuery = useQuery(trpc.organizations.getActiveOrganization.queryOptions());
  const membersQuery = useQuery(trpc.organizations.listMembers.queryOptions());

  const org = orgQuery.data;
  const memberCount = membersQuery.data?.members.length ?? 0;

  if (orgQuery.isLoading) {
    return <p className="text-muted-foreground text-sm">Loading organization…</p>;
  }

  if (!org) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <h2 className="text-lg font-semibold">No organization</h2>
        <p className="text-muted-foreground mt-2 text-sm">
          Create or join an organization during onboarding to manage settings.
        </p>
        <Button asChild className="mt-4" size="sm">
          <Link to="/onboarding">Go to onboarding</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">{org.name}</h2>
            <p className="text-muted-foreground mt-1 text-sm">
              {org.firmDisplayName || org.name}
            </p>
          </div>
          <Badge variant="secondary">{org.membershipRole ?? "MEMBER"}</Badge>
        </div>

        <dl className="mt-6 grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              Slug
            </dt>
            <dd className="mt-1 text-sm">{org.slug}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              Email domain
            </dt>
            <dd className="mt-1 text-sm">{org.primaryEmailDomain || "—"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              Onboarding
            </dt>
            <dd className="mt-1 text-sm">{org.onboardingStatus}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              Members
            </dt>
            <dd className="mt-1 text-sm">{memberCount}</dd>
          </div>
        </dl>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline" size="sm">
          <Link to="/settings/members">Manage members</Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link to="/settings/investment-criteria">Edit criteria</Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link to="/settings/playbook">Edit playbook</Link>
        </Button>
      </div>
    </div>
  );
}
