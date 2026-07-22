import { createFileRoute } from "@tanstack/react-router";
import { ProjectKickoffWorkspace } from "@/components/project-kickoff/project-kickoff-workspace";

export const Route = createFileRoute("/_public/project-kickoff/")({
  validateSearch: (search: Record<string, unknown>) => ({
    workspaceSlug:
      typeof search.workspaceSlug === "string" && search.workspaceSlug.trim()
        ? search.workspaceSlug.trim()
        : undefined,
  }),
  head: () => ({
    meta: [{ title: "AI → Project Kickoff — Dark Alpha Capital" }],
  }),
  component: ProjectKickoffPage,
});

function ProjectKickoffPage() {
  const { workspaceSlug } = Route.useSearch();

  return (
    <section className="container max-w-5xl p-4">
      <ProjectKickoffWorkspace
        publicEmbed
        initialWorkspaceSlug={workspaceSlug}
      />
    </section>
  );
}
