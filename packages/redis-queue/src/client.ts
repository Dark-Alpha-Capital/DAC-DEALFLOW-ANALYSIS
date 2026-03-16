import { Queue } from "bullmq";
import {
  QUEUE_NAMES,
  type JobStatus,
  type JobType,
  type JobProgressData,
  type JobWithMetadata,
  type ScreenDealJobData,
  type FileUploadJobData,
  type CIMExtractionJobData,
  type RagIngestionJobData,
} from "./types";
import {
  screenDealQueue,
  fileUploadQueue,
  cimExtractionQueue,
  ragIngestionQueue,
} from "./queues";

export async function getJobStatus(queueName: string, jobId: string) {
  const queue = getQueue(queueName);
  const job = await queue.getJob(jobId);
  if (!job) return null;
  const state = await job.getState();
  const progress = job.progress as JobProgressData | undefined;
  return {
    jobId,
    state,
    progress,
    returnvalue: job.returnvalue,
    failedReason: job.failedReason,
  };
}

export async function createScreenDealJob(data: ScreenDealJobData) {
  const job = await screenDealQueue.add("screen", data, {
    jobId: data.jobId,
  });
  return { jobId: job.id, queueName: QUEUE_NAMES.SCREEN_DEAL };
}

export async function createFileUploadJob(data: FileUploadJobData) {
  const job = await fileUploadQueue.add("upload", data, {
    jobId: data.jobId,
  });
  return { jobId: job.id, queueName: QUEUE_NAMES.FILE_UPLOAD };
}

export async function getAllUserJobs(
  userId: string,
): Promise<JobWithMetadata[]> {
  const jobStates: JobStatus[] = [
    "waiting",
    "active",
    "completed",
    "failed",
    "delayed",
  ];

  const [screenDealJobs, fileUploadJobs, cimExtractionJobs, ragIngestionJobs] =
    await Promise.all([
      screenDealQueue.getJobs(jobStates, 0, 1000),
      fileUploadQueue.getJobs(jobStates, 0, 1000),
      cimExtractionQueue.getJobs(jobStates, 0, 1000),
      ragIngestionQueue.getJobs(jobStates, 0, 1000),
    ]);

  const allJobs = [
    ...screenDealJobs.map((job) => ({ job, queueName: QUEUE_NAMES.SCREEN_DEAL })),
    ...fileUploadJobs.map((job) => ({ job, queueName: QUEUE_NAMES.FILE_UPLOAD })),
    ...cimExtractionJobs.map((job) => ({
      job,
      queueName: QUEUE_NAMES.CIM_EXTRACTION,
    })),
    ...ragIngestionJobs.map((job) => ({
      job,
      queueName: QUEUE_NAMES.RAG_INGESTION,
    })),
  ];

  const userJobs: JobWithMetadata[] = [];
  for (const { job, queueName } of allJobs) {
    const jobData = job.data as
      | ScreenDealJobData
      | FileUploadJobData
      | CIMExtractionJobData
      | RagIngestionJobData;
    const jobUserId = "userId" in jobData ? jobData.userId : undefined;
    if (jobUserId === userId) {
      const state = (await job.getState()) as JobStatus;
      const progress = (job.progress as JobProgressData | undefined) || null;
      userJobs.push({
        jobId: job.id!,
        queueName: queueName as JobType,
        state,
        progress,
        createdAt: job.timestamp || Date.now(),
        updatedAt: job.processedOn || job.timestamp || Date.now(),
        returnvalue: job.returnvalue,
        failedReason: job.failedReason || null,
        attemptsMade: job.attemptsMade,
        userId: jobUserId ?? "",
        dealId: "dealId" in jobData ? jobData.dealId : undefined,
        fileName: "fileName" in jobData ? jobData.fileName : undefined,
        screenerId: "screenerId" in jobData ? jobData.screenerId : undefined,
      });
    }
  }
  return userJobs.sort((a, b) => b.createdAt - a.createdAt);
}

export async function getLatestUserJobs(
  userId: string,
  limit: number = 5,
): Promise<JobWithMetadata[]> {
  const allJobs = await getAllUserJobs(userId);
  return allJobs.slice(0, limit);
}

export async function deleteUserJob(
  userId: string,
  jobId: string,
  queueName: string,
): Promise<boolean> {
  const userJobs = await getAllUserJobs(userId);
  const job = userJobs.find(
    (j) => j.jobId === jobId && j.queueName === queueName,
  );
  if (!job) throw new Error("Job not found or does not belong to user");

  const queue = getQueue(queueName);
  const bullmqJob = await queue.getJob(jobId);
  if (!bullmqJob) throw new Error("Job not found in queue");
  await bullmqJob.remove();
  return true;
}

function getQueue(queueName: string): Queue {
  switch (queueName) {
    case QUEUE_NAMES.SCREEN_DEAL:
      return screenDealQueue;
    case QUEUE_NAMES.FILE_UPLOAD:
      return fileUploadQueue;
    case QUEUE_NAMES.CIM_EXTRACTION:
      return cimExtractionQueue;
    case QUEUE_NAMES.RAG_INGESTION:
      return ragIngestionQueue;
    default:
      throw new Error(`Unknown queue name: ${queueName}`);
  }
}
