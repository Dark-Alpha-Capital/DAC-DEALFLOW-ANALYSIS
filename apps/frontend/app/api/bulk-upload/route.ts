import { NextRequest } from "next/server";
import {
  fileUploadQueue,
  type FileUploadJobData,
  type CompanyMetadata,
} from "@/lib/queue-client";
import { randomUUID } from "crypto";
import { getSession } from "@/lib/auth-server";
import { getCompanyById } from "db/queries";
import { createClient } from "webdav";

export async function POST(req: NextRequest) {
  const userSession = await getSession();
  if (!userSession) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
    });
  }

  const userId = userSession.user.id;

  // Validate userId exists
  if (!userId || userId.trim() === "") {
    console.error("[bulk-upload] userId is missing or empty", {
      userSession: userSession.user,
    });
    return new Response(
      JSON.stringify({ error: "User ID is required but not found in session" }),
      { status: 401 },
    );
  }

  console.log("[bulk-upload] User authenticated", { userId });

  try {
    const formData = await req.formData();

    // Debug: Log all formData keys and values
    console.log("[bulk-upload] FormData entries:");
    for (const [key, value] of formData.entries()) {
      if (
        value &&
        typeof value === "object" &&
        "name" in value &&
        "size" in value
      ) {
        const file = value as File;
        console.log(`  ${key}: File(${file.name}, ${file.size} bytes)`);
      } else {
        console.log(`  ${key}: ${String(value)}`);
      }
    }

    const files = formData.getAll("files") as File[];
    const companyId = formData.get("companyId") as string | null;

    console.log("[bulk-upload] Extracted values:", {
      companyId,
      companyIdType: typeof companyId,
      filesCount: files.length,
    });

    // Validate required fields
    if (!companyId || companyId.trim() === "") {
      console.error("[bulk-upload] companyId is required or empty", {
        companyId,
        companyIdType: typeof companyId,
        formDataKeys: Array.from(formData.keys()),
      });
      return new Response(JSON.stringify({ error: "companyId is required" }), {
        status: 400,
      });
    }

    if (!files.length) {
      console.error("[bulk-upload] No files uploaded");
      return new Response(JSON.stringify({ error: "No files uploaded" }), {
        status: 400,
      });
    }

    // Fetch company details once for all files
    const company = await getCompanyById(companyId);
    if (!company) {
      console.error("[bulk-upload] Company not found", { companyId });
      return new Response(JSON.stringify({ error: "Company not found" }), {
        status: 404,
      });
    }

    console.log("[bulk-upload] Company found", { company });

    // Extract company metadata for job data
    const companyMetadata: CompanyMetadata = {
      name: company.name,
      sector: company.sector,
      stage: company.stage,
      headquarters: company.headquarters,
      revenue: company.revenue ? parseFloat(company.revenue) : null,
      ebitda: company.ebitda ? parseFloat(company.ebitda) : null,
    };

    // Create Nextcloud client for temporary file uploads
    const nextcloudClient = createClient(
      `${process.env.NEXTCLOUD_URL}/remote.php/dav/files/${process.env.NEXTCLOUD_USER}`,
      {
        username: process.env.NEXTCLOUD_USER,
        password: process.env.NEXTCLOUD_PASSWORD,
      },
    );

    // Ensure temp directory exists
    const tempDir = "temp-uploads";
    try {
      await nextcloudClient.createDirectory(tempDir, { recursive: true });
    } catch (err) {
      // Directory might already exist, which is fine
      console.log("[bulk-upload] Temp directory may already exist");
    }

    // Add jobs to BullMQ queue
    const jobPromises = files.map(async (file, index) => {
      // Generate a unique jobId for this job
      const jobId = randomUUID();

      console.log(
        `[bulk-upload] Processing file ${index + 1}/${files.length}`,
        {
          jobId,
          name: file.name,
          size: file.size,
        },
      );

      // Upload file to temporary Nextcloud location first
      // This avoids sending large base64 data through BullMQ
      const tempFileName = `${jobId}-${file.name}`;
      const tempPath = `${tempDir}/${tempFileName}`;

      try {
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        await nextcloudClient.putFileContents(tempPath, buffer);

        console.log(`[bulk-upload] File uploaded to temp location`, {
          jobId,
          tempPath,
          size: file.size,
        });
      } catch (uploadError) {
        console.error(
          `[bulk-upload] Failed to upload temp file for ${jobId}:`,
          uploadError,
        );
        throw new Error(
          `Failed to upload file to temporary storage: ${uploadError instanceof Error ? uploadError.message : "Unknown error"}`,
        );
      }

      const mimeType = file.type || "application/octet-stream";

      // Create job data - only store file path, not the entire file content
      const jobData: FileUploadJobData = {
        jobId,
        fileName: file.name,
        tempFilePath: tempPath, // Path to temp file in Nextcloud
        fileSize: file.size,
        mimeType,
        userId,
        companyId,
        companyMetadata,
      };

      // Validate required fields
      if (!jobData.userId || jobData.userId.trim() === "") {
        throw new Error(
          `userId is required but was not provided for job ${jobId}`,
        );
      }

      if (!jobData.companyId || jobData.companyId.trim() === "") {
        throw new Error(
          `companyId is required but was not provided for job ${jobId}`,
        );
      }

      if (!jobData.companyMetadata) {
        throw new Error(
          `companyMetadata is required but was not provided for job ${jobId}`,
        );
      }

      // Log job data before queueing
      console.log(`[bulk-upload] Queueing job with data:`, {
        jobId: jobData.jobId,
        fileName: jobData.fileName,
        userId: jobData.userId,
        companyId: jobData.companyId,
        companyMetadata: jobData.companyMetadata,
        dataKeys: Object.keys(jobData),
      });

      // Add job to queue - pass data directly, just like onboarding example
      const job = await fileUploadQueue.add("upload", jobData, {
        jobId, // Use our own jobId for easier tracking
      });

      console.log(`[bulk-upload] Job ${job.id} added to queue successfully`, {
        fileName: file.name,
      });

      return { jobId, fileName: file.name, bullmqJobId: job.id };
    });

    const queuedJobs = await Promise.all(jobPromises);
    console.log(
      `[bulk-upload] All ${queuedJobs.length} jobs added to BullMQ queue`,
    );

    return new Response(
      JSON.stringify({
        ok: true,
        message: "Bulk upload queued",
        jobs: queuedJobs.map((j) => ({ jobId: j.jobId, fileName: j.fileName })),
        companyId,
        companyName: company.name,
      }),
      { status: 202 },
    );
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    console.error("[bulk-upload] Error:", err);
    return new Response(JSON.stringify({ ok: false, error: errorMessage }), {
      status: 500,
    });
  }
}
