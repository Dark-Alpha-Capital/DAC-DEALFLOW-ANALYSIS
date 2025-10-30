import { Storage } from "@google-cloud/storage";

export const storage = new Storage({
  projectId: process.env.GCLOUD_PROJECT_ID,
  credentials: {
    client_email: process.env.GCS_CLIENT_EMAIL,
    private_key: process.env.GCS_PRIVATE_KEY?.split(String.raw`\n`).join("\n"),
  },
});

export const GCLOUD_BUCKET = process.env.GCLOUD_BUCKET;

// Browser File upload
export async function uploadFile(file: File): Promise<string | null>;
// Node Buffer upload
export async function uploadFile(
  buffer: Buffer,
  filename: string
): Promise<string | null>;
export async function uploadFile(
  fileOrBuffer: File | Buffer,
  filename?: string
): Promise<string | null> {
  try {
    const bucket = storage.bucket(GCLOUD_BUCKET as string);
    let name: string;
    let dataBuffer: Buffer;

    if (typeof (fileOrBuffer as any).arrayBuffer === "function") {
      const file = fileOrBuffer as File;
      name = file.name;
      const arrayBuffer = await file.arrayBuffer();
      dataBuffer = Buffer.from(arrayBuffer);
    } else {
      name = filename as string;
      dataBuffer = fileOrBuffer as Buffer;
    }

    const blob = bucket.file(name);
    const blobStream = blob.createWriteStream();

    await new Promise((resolve, reject) => {
      blobStream.on("error", reject);
      blobStream.on("finish", resolve);
      blobStream.end(dataBuffer);
    });

    return blob.publicUrl();
  } catch (error) {
    console.error(error);
    return null;
  }
}

export default storage;
