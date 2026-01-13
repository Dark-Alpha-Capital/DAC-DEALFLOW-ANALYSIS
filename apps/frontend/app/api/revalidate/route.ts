import { NextRequest, NextResponse } from "next/server";
import { updateTag } from "next/cache";

/**
 * API route to revalidate Next.js cache tags
 * Used by worker processes to trigger cache revalidation after background jobs complete
 *
 * Security: Should be protected with a secret token in production
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tags } = body;

    if (!tags || !Array.isArray(tags)) {
      return NextResponse.json(
        { error: "tags array is required" },
        { status: 400 }
      );
    }

    // Revalidate each tag
    for (const tag of tags) {
      if (typeof tag === "string") {
        updateTag(tag);
        console.log(`[revalidate] Updated cache tag: ${tag}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Revalidated ${tags.length} cache tag(s)`,
      tags,
    });
  } catch (error) {
    console.error("[revalidate] Error revalidating cache:", error);
    return NextResponse.json(
      {
        error: "Failed to revalidate cache",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
