import type { FileStat } from "webdav";
import { getClient } from "./client";
import {
  buildNextcloudFileUrl,
  extractFilePathFromUrl,
  sanitizeFilename,
} from "./utils";

export interface NextcloudFile {
  name: string;
  size: number;
  lastModified: string;
  mimeType: string;
  downloadUrl: string;
}

const ensureLeadingSlash = (folderPath: string): string => {
  if (!folderPath) return "/";
  return folderPath.startsWith("/") ? folderPath : `/${folderPath}`;
};

const getDirectoryFromPath = (filePath: string): string | null => {
  const lastSlashIndex = filePath.lastIndexOf("/");
  if (lastSlashIndex <= 0) {
    return null;
  }
  return filePath.slice(0, lastSlashIndex);
};

/**
 * Upload a File/Blob to Nextcloud under the given folder.
 * Returns a download URL or null on error.
 */
export const uploadFile = async (
  file: File | Blob,
  folderPath: string = "/Documents",
): Promise<string | null> => {
  try {
    const client = getClient();

    const rawFileName =
      file instanceof File
        ? file.name
        : `upload-${Date.now()}.${file.type.split("/")[1] || "bin"}`;

    const sanitizedFileName = sanitizeFilename(rawFileName);

    const normalizedFolderPath = ensureLeadingSlash(folderPath);
    const filePath = `${normalizedFolderPath}/${sanitizedFileName}`;

    try {
      await client.createDirectory(normalizedFolderPath, { recursive: true });
    } catch (error: any) {
      if (
        !error?.message?.includes("405") &&
        !error?.message?.includes("exists")
      ) {
        console.warn(
          `Could not create directory ${normalizedFolderPath}:`,
          error,
        );
      }
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    await client.putFileContents(filePath, buffer, {
      overwrite: true,
      contentLength: buffer.length,
    });

    return buildNextcloudFileUrl(filePath);
  } catch (error) {
    console.error("Error uploading file to Nextcloud:", error);
    return null;
  }
};

/**
 * Upload a raw Buffer/Uint8Array to a specific Nextcloud path.
 * Ensures the directory exists. Returns the download URL.
 */
export const uploadBuffer = async (
  buffer: Buffer | Uint8Array,
  filePath: string,
): Promise<string> => {
  const client = getClient();

  const dir = getDirectoryFromPath(filePath);
  if (dir) {
    try {
      await client.createDirectory(dir, { recursive: true });
    } catch (error: any) {
      if (
        !error?.message?.includes("405") &&
        !error?.message?.includes("exists")
      ) {
        console.warn(`Could not create directory ${dir}:`, error);
      }
    }
  }

  await client.putFileContents(filePath, Buffer.from(buffer), {
    overwrite: true,
  });

  return buildNextcloudFileUrl(filePath);
};

/**
 * List all non-directory files in a folder.
 */
export const listFiles = async (
  folderPath: string,
): Promise<NextcloudFile[]> => {
  const client = getClient();
  const contents = await client.getDirectoryContents(folderPath);

  const files = (contents as FileStat[]).map((item) => ({
    name: item.basename,
    size: item.size,
    lastModified: item.lastmod,
    mimeType: item.mime ?? "",
    downloadUrl: buildNextcloudFileUrl(item.filename),
  }));

  return files.filter((f) => f.mimeType !== "httpd/unix-directory");
};

/**
 * Delete a file by its full Nextcloud URL.
 */
export const deleteFile = async (fileUrl: string): Promise<boolean> => {
  try {
    const client = getClient();
    const filePath = extractFilePathFromUrl(fileUrl);

    if (!filePath) {
      console.error("Could not extract file path from URL:", fileUrl);
      return false;
    }

    await client.deleteFile(filePath);
    return true;
  } catch (error: any) {
    if (error?.response?.status === 404) {
      return true;
    }
    console.error("Error deleting file from Nextcloud:", error);
    return false;
  }
};

/**
 * Get directory contents as raw Buffer.
 */
export const getFileContents = async (
  filePath: string,
): Promise<Buffer | Uint8Array | ArrayBuffer> => {
  const client = getClient();
  const contents = await client.getFileContents(filePath, {
    format: "binary",
  });
  return contents as Buffer | Uint8Array | ArrayBuffer;
};

export const fileExists = async (filePath: string): Promise<boolean> => {
  const client = getClient();
  return client.exists(filePath);
};

export const createDirectory = async (
  folderPath: string,
  options?: { recursive?: boolean },
): Promise<void> => {
  const client = getClient();
  await client.createDirectory(folderPath, {
    recursive: true,
    ...options,
  });
};
