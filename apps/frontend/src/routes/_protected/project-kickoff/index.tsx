import { createFileRoute } from "@tanstack/react-router";
import { ProjectKickoffWorkspace } from "@/components/project-kickoff/project-kickoff-workspace";

export const Route = createFileRoute("/_protected/project-kickoff/")({
  head: () => ({
    meta: [{ title: "AI → Project Kickoff — Dark Alpha Capital" }],
  }),
  component: ProjectKickoffPage,
});

function ProjectKickoffPage() {
  return (
    <section className="big-container block-space min-h-screen">
      <ProjectKickoffWorkspace />
    </section>
  );
}

///since we're storing this in _protected rather than public, so the file gets simplified.