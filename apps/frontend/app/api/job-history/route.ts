import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { redisClient } from "@/lib/redis";

export async function DELETE() {
  const userSession = await auth();

  if (!userSession) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get all job keys from Redis
    const jobKeys = await redisClient.keys("job:*");

    if (jobKeys.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No jobs to delete",
        deletedCount: 0,
      });
    }

    // Filter jobs that belong to the current user
    const userJobKeys: string[] = [];

    for (const key of jobKeys) {
      try {
        const jobData = await redisClient.hgetall(key);
        if (jobData.userId === userSession.user.id) {
          userJobKeys.push(key);
        }
      } catch (error) {
        console.error(`Error checking job data for key ${key}:`, error);
      }
    }

    if (userJobKeys.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No jobs found for user",
        deletedCount: 0,
      });
    }

    // Delete all user's jobs
    const deletePromises = userJobKeys.map((key) => redisClient.del(key));
    await Promise.all(deletePromises);

    console.log(
      `Deleted ${userJobKeys.length} jobs for user ${userSession.user.id}`,
    );

    return NextResponse.json({
      success: true,
      message: `Deleted ${userJobKeys.length} jobs successfully`,
      deletedCount: userJobKeys.length,
    });
  } catch (error) {
    console.error("Error deleting all jobs:", error);
    return NextResponse.json(
      { error: "Failed to delete all jobs" },
      { status: 500 },
    );
  }
}
