import { createClient, type FileStat } from "webdav";

// Interface for deal files
export interface DealFile {
  name: string;
  size: number;
  lastModified: string;
  mimeType: string;
  downloadUrl: string;
}

// Get Nextcloud configuration
const getNextcloudConfig = () => {
  const url = process.env.NEXTCLOUD_URL;
  const user = process.env.NEXTCLOUD_USER;
  const password = process.env.NEXTCLOUD_PASSWORD;

  if (!url || !user || !password) {
    throw new Error(
      "Nextcloud configuration is missing. Please set NEXTCLOUD_URL, NEXTCLOUD_USER, and NEXTCLOUD_PASSWORD environment variables.",
    );
  }

  return { url, user, password };
};

// Initialize the Client with Basic Auth
export const getClient = () => {
  const { url, user, password } = getNextcloudConfig();
  const clientUrl = `${url}/remote.php/dav/files/${user}`;

  return createClient(clientUrl, {
    username: user,
    password: password,
  });
};

/**
 * Uploads a file to Nextcloud
 * @param file - The file to upload (File or Blob)
 * @param folderPath - Optional folder path relative to user root (e.g., "/Documents" or "/Candidates")
 * @returns The public URL of the uploaded file
 */
export async function uploadFileToNextCloud(
  file: File | Blob,
  folderPath: string = "/Documents",
): Promise<string | null> {
  try {
    const client = getClient();
    const { url: nextcloudUrl, user } = getNextcloudConfig();

    // Generate a unique filename with timestamp to avoid conflicts
    const fileName =
      file instanceof File
        ? file.name
        : `upload-${Date.now()}.${file.type.split("/")[1] || "bin"}`;

    // Sanitize filename to remove special characters that might cause issues
    const sanitizedFileName = fileName
      .replace(/[^a-zA-Z0-9._-]/g, "_")
      .replace(/_{2,}/g, "_");

    // Ensure folder path starts with /
    const normalizedFolderPath = folderPath.startsWith("/")
      ? folderPath
      : `/${folderPath}`;

    // Create the full path
    const filePath = `${normalizedFolderPath}/${sanitizedFileName}`;

    // Ensure the directory exists
    try {
      await client.createDirectory(normalizedFolderPath, { recursive: true });
    } catch (error: any) {
      // Directory might already exist, which is fine
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

    // Convert File/Blob to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload the file
    await client.putFileContents(filePath, buffer, {
      overwrite: true,
      contentLength: buffer.length,
    });

    // Generate the public URL
    // Nextcloud public URL format: https://nextcloud.example.com/s/{shareToken}
    // For direct file access, we'll use the WebDAV download link
    const downloadUrl = client.getFileDownloadLink(filePath);

    // If you have a public share setup, you might want to use that instead
    // For now, we'll return the WebDAV download link which requires authentication
    // You may need to create a public share and return that URL instead
    return downloadUrl;
  } catch (error) {
    console.error("Error uploading file to Nextcloud:", error);
    return null;
  }
}

/**
 * Lists all files in a specific Deal folder.
 * @param folderPath - The path relative to the user's root, e.g., "/Deals/Deal_Alpha"
 */
export async function listDealFiles(folderPath: string): Promise<DealFile[]> {
  try {
    const client = createClient(
      `${process.env.NEXTCLOUD_URL}/remote.php/dav/files/${process.env.NEXTCLOUD_USER}`,
      {
        username: process.env.NEXTCLOUD_USER,
        password: process.env.NEXTCLOUD_PASSWORD,
      },
    );

    console.log("Listing files for folder:", { folderPath });

    // Get directory contents
    const contents = await client.getDirectoryContents(folderPath);
    console.log("Contents:", { contents });
    // Transform the data
    const files = (contents as FileStat[]).map((item) => ({
      name: item.basename,
      size: item.size,
      lastModified: item.lastmod,
      mimeType: item.mime ?? "",
      downloadUrl: client.getFileDownloadLink(item.filename),
    }));

    return files.filter((f) => f.mimeType !== "httpd/unix-directory");
  } catch (error) {
    console.error("Error connecting to Nextcloud:", error);
    throw error;
  }
}

/**
 * Extracts the file path from a Nextcloud file URL
 * @param fileUrl - The full Nextcloud file URL (e.g., "https://nextcloud.example.com/remote.php/dav/files/username/Diligence/companyId/fileName")
 * @returns The file path relative to the user's root (e.g., "Diligence/companyId/fileName")
 */
export function extractFilePathFromUrl(fileUrl: string): string | null {
  try {
    const { url, user } = getNextcloudConfig();
    // Handle both with and without trailing slash
    const basePathWithSlash = `${url}/remote.php/dav/files/${user}/`;
    const basePathWithoutSlash = `${url}/remote.php/dav/files/${user}`;

    let filePath: string | null = null;

    if (fileUrl.startsWith(basePathWithSlash)) {
      filePath = fileUrl.replace(basePathWithSlash, "");
    } else if (fileUrl.startsWith(basePathWithoutSlash)) {
      // Remove the base path and any leading slash
      filePath = fileUrl.replace(basePathWithoutSlash, "").replace(/^\//, "");
    } else {
      console.error("File URL does not match expected Nextcloud URL format", {
        fileUrl,
        expectedBase: basePathWithSlash,
      });
      return null;
    }

    return filePath || null;
  } catch (error) {
    console.error("Error extracting file path from URL:", error);
    return null;
  }
}

/**
 * Deletes a file from Nextcloud
 * @param fileUrl - The full Nextcloud file URL
 * @returns True if deletion was successful, false otherwise
 */
export async function deleteFileFromNextCloud(
  fileUrl: string,
): Promise<boolean> {
  try {
    const client = getClient();
    const filePath = extractFilePathFromUrl(fileUrl);

    if (!filePath) {
      console.error("Could not extract file path from URL:", fileUrl);
      return false;
    }

    await client.deleteFile(filePath);
    console.log("File deleted successfully from Nextcloud:", filePath);
    return true;
  } catch (error: any) {
    // 404 is acceptable - file may have already been deleted
    if (error?.response?.status === 404) {
      console.log("File already deleted or not found:", fileUrl);
      return true; // Consider it successful if already deleted
    }
    console.error("Error deleting file from Nextcloud:", error);
    return false;
  }
}

/**
 * Gets the download URL for a file
 * @param fileUrl - The full Nextcloud file URL
 * @returns The download URL (same as fileUrl for viewing/downloading)
 */
export function getFileDownloadUrl(fileUrl: string): string {
  // The fileUrl is already a download URL, but we can use getFileDownloadLink
  // if we need to generate a fresh link. For now, return as-is.
  return fileUrl;
}
