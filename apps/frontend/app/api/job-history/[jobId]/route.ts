import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { redisClient } from "@/lib/redis";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const userSession = await auth();

  if (!userSession) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { jobId } = await params;

  if (!jobId) {
    return NextResponse.json({ error: "Job ID is required" }, { status: 400 });
  }

  try {
    const jobKey = `job:${jobId}`;

    // Check if job exists and belongs to the user
    const jobData = await redisClient.hgetall(jobKey);

    if (!jobData || Object.keys(jobData).length === 0) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    if (jobData.userId !== userSession.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Delete the job from Redis
    await redisClient.del(jobKey);

    console.log(`Deleted job ${jobId} for user ${userSession.user.id}`);

    return NextResponse.json({
      success: true,
      message: "Job deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting job:", error);
    return NextResponse.json(
      { error: "Failed to delete job" },
      { status: 500 },
    );
  }
}
