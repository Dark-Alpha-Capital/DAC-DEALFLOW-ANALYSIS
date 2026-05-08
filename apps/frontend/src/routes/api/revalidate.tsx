import { createFileRoute } from "@tanstack/react-router";
import { revalidateTag } from "@/lib/cache-invalidation";

export const Route = createFileRoute("/api/revalidate")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = (await request.json()) as { tags?: unknown };
          const { tags } = body;

          if (!tags || !Array.isArray(tags)) {
            return Response.json(
              { error: "tags array is required" },
              { status: 400 },
            );
          }

          for (const tag of tags) {
            if (typeof tag === "string") {
              revalidateTag(tag, "max");
              console.log(`[revalidate] Revalidated cache tag: ${tag}`);
            }
          }

          return Response.json({
            success: true,
            message: `Revalidated ${tags.length} cache tag(s)`,
            tags,
          });
        } catch (error) {
          console.error("[revalidate] Error revalidating cache:", error);
          return Response.json(
            {
              error: "Failed to revalidate cache",
              message: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 },
          );
        }
      },
    },
  },
});
