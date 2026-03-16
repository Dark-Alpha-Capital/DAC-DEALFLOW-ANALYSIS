import { getNextcloudConfig } from "./client";

export const sanitizeFilename = (fileName: string): string => {
  return fileName
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_{2,}/g, "_");
};

const trimTrailingSlashes = (value: string): string => value.replace(/\/+$/, "");

const safeDecodeURIComponent = (value: string): string => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

const normalizeRelativePath = (filePath: string): string =>
  filePath.replace(/^\/+/, "");

const encodePathSegment = (segment: string): string =>
  encodeURIComponent(safeDecodeURIComponent(segment));

/**
 * Builds a canonical Nextcloud DAV file URL without embedding credentials.
 */
export const buildNextcloudFileUrl = (filePath: string): string => {
  const { url, user } = getNextcloudConfig();
  const normalizedBaseUrl = trimTrailingSlashes(url);
  const normalizedPath = normalizeRelativePath(filePath);
  const encodedUser = encodeURIComponent(user);
  const encodedPath = normalizedPath
    .split("/")
    .filter(Boolean)
    .map(encodePathSegment)
    .join("/");

  return `${normalizedBaseUrl}/remote.php/dav/files/${encodedUser}/${encodedPath}`;
};

/**
 * Extracts the file path from a Nextcloud file URL
 * @param fileUrl - The full Nextcloud file URL (e.g., "https://nextcloud.example.com/remote.php/dav/files/username/path/to/file")
 * @returns The file path relative to the user's root (e.g., "path/to/file")
 */
export const extractFilePathFromUrl = (fileUrl: string): string | null => {
  try {
    const { url, user } = getNextcloudConfig();
    const parsedFileUrl = new URL(fileUrl);
    const parsedBaseUrl = new URL(url);

    if (parsedFileUrl.host !== parsedBaseUrl.host) {
      console.error("File URL host does not match configured Nextcloud host", {
        configuredHost: parsedBaseUrl.host,
        fileUrl,
      });
      return null;
    }

    const decodedPathname = safeDecodeURIComponent(parsedFileUrl.pathname);
    const expectedPathPrefixWithSlash = `/remote.php/dav/files/${user}/`;
    const expectedPathPrefixWithoutSlash = `/remote.php/dav/files/${user}`;

    let relativePath: string | null = null;

    if (decodedPathname.startsWith(expectedPathPrefixWithSlash)) {
      relativePath = decodedPathname.slice(expectedPathPrefixWithSlash.length);
    } else if (decodedPathname.startsWith(expectedPathPrefixWithoutSlash)) {
      relativePath = decodedPathname
        .slice(expectedPathPrefixWithoutSlash.length)
        .replace(/^\/+/, "");
    }

    if (relativePath == null) {
      console.error("File URL does not match expected Nextcloud URL format", {
        actualPathname: parsedFileUrl.pathname,
        fileUrl,
        expectedPathPrefix: expectedPathPrefixWithSlash,
      });
      return null;
    }

    return relativePath || null;
  } catch (error) {
    console.error("Error extracting file path from URL:", error);
    return null;
  }
};
