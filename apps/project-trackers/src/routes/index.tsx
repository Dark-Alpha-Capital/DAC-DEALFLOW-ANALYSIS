import { createFileRoute, redirect } from "@tanstack/react-router";
import { PROJECT_TRACKERS_INDEX_DEFAULT_SEARCH } from "@/lib/route-search";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    throw redirect({
      to: "/project-trackers",
      search: PROJECT_TRACKERS_INDEX_DEFAULT_SEARCH,
    });
  },
});
