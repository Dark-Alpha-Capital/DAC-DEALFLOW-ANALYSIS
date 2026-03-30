import { createFileRoute } from "@tanstack/react-router";
import ProfileForm from "@/components/forms/profile-form";
import { loadProfileRouteData } from "@/lib/server/profile-route-data";

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
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="mb-6 text-3xl font-bold">User Profile</h1>
      <div className="rounded-lg p-6 shadow">
        <ProfileForm user={userWithAccounts} />
        <div className="mt-8"></div>
      </div>
    </div>
  );
}
