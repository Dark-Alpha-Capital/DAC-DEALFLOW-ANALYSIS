import { createFileRoute } from "@tanstack/react-router";
import { ProjectKickoffWorkspace } from "@/components/project-kickoff/project-kickoff-workspace";

export const Route = createFileRoute("/_public/project-kickoff/")({
  head: () => ({
    meta: [{ title: "AI → Project Kickoff — Dark Alpha Capital" }],
  }),
  component: ProjectKickoffPage,
});

function ProjectKickoffPage() {
  return (
    <section className="container max-w-5xl p-4">
      <ProjectKickoffWorkspace />
    </section>
  );
}
