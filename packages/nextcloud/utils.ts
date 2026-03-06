import { getNextcloudConfig } from "./client";

export const sanitizeFilename = (fileName: string): string => {
  return fileName
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_{2,}/g, "_");
};

/**
 * Extracts the file path from a Nextcloud file URL
 * @param fileUrl - The full Nextcloud file URL (e.g., "https://nextcloud.example.com/remote.php/dav/files/username/path/to/file")
 * @returns The file path relative to the user's root (e.g., "path/to/file")
 */
export const extractFilePathFromUrl = (fileUrl: string): string | null => {
  try {
    const { url, user } = getNextcloudConfig();

    const basePathWithSlash = `${url}/remote.php/dav/files/${user}/`;
    const basePathWithoutSlash = `${url}/remote.php/dav/files/${user}`;

    let filePath: string | null = null;

    if (fileUrl.startsWith(basePathWithSlash)) {
      filePath = fileUrl.replace(basePathWithSlash, "");
    } else if (fileUrl.startsWith(basePathWithoutSlash)) {
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
};

