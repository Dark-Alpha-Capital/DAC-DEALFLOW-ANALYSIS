export const MIME = {
  PDF: "application/pdf",
  DOCX: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  XLSX: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  XLS: "application/vnd.ms-excel",
  TEXT: "text/plain",
  CSV: "text/csv",
  JSON: "application/json",
} as const;

export const TEXT_LIKE = new Set([MIME.TEXT, MIME.CSV, MIME.JSON]);

export const EXCEL = new Set([MIME.XLSX, MIME.XLS]);

/**
 * Mapping from lowercase file extension to the canonical MIME we handle in
 * ingestion. `doc` maps to DOCX because `mammoth` handles DOCX specifically;
 * legacy .doc binaries are a best-effort fallback (often still works via the
 * DOCX path when files have been re-saved as the XML format).
 */
const EXT_TO_MIME: Readonly<Record<string, string>> = {
  pdf: MIME.PDF,
  docx: MIME.DOCX,
  doc: MIME.DOCX,
  txt: MIME.TEXT,
  md: MIME.TEXT,
  log: MIME.TEXT,
  csv: MIME.CSV,
  xlsx: MIME.XLSX,
  xls: MIME.XLS,
  json: MIME.JSON,
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  mp4: "video/mp4",
  mov: "video/quicktime",
};

/**
 * MIMEs the ingestion pipeline knows how to dispatch (see `processContent`).
 * If the declared MIME is one of these we trust it; otherwise we prefer the
 * extension-derived MIME, because browsers routinely report `application/
 * octet-stream` or `application/zip` for Office files (xlsx/docx are ZIPs
 * internally) and that would otherwise fall through to `unsupported`.
 */
const KNOWN_DOC_MIMES: ReadonlySet<string> = new Set([
  MIME.PDF,
  MIME.DOCX,
  MIME.XLSX,
  MIME.XLS,
  MIME.TEXT,
  MIME.CSV,
  MIME.JSON,
]);

function isMediaMime(mime: string): boolean {
  return (
    mime.startsWith("image/") ||
    mime.startsWith("audio/") ||
    mime.startsWith("video/")
  );
}

function extensionFromFileName(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  if (dot < 0 || dot === fileName.length - 1) return "";
  return fileName.slice(dot + 1).toLowerCase();
}

/**
 * Produce the canonical MIME type for an uploaded file, preferring the
 * filename's extension over a generic or unknown declared MIME. This is
 * critical for Office files: browsers often report `application/octet-stream`
 * or `application/zip` for `.xlsx`/`.docx`, which would otherwise be rejected
 * by the ingestion dispatcher.
 */
export function resolveMimeType(fileName: string, mimeType: string | null): string {
  const declared = mimeType?.trim().toLowerCase() ?? "";
  const ext = extensionFromFileName(fileName);
  const extMime = EXT_TO_MIME[ext];

  const declaredIsGeneric =
    declared === "" ||
    declared === "application/octet-stream" ||
    declared === "application/zip" ||
    declared === "application/x-zip-compressed" ||
    declared === "binary/octet-stream";

  if (declaredIsGeneric && extMime) return extMime;

  // If the declared MIME isn't one of our supported document types and isn't
  // media either, but the extension points at something we handle, trust the
  // extension. Example: `.csv` reported as `application/vnd.ms-excel` by some
  // versions of Excel — we want the CSV path, not the XLSX path.
  if (extMime && !KNOWN_DOC_MIMES.has(declared) && !isMediaMime(declared)) {
    return extMime;
  }

  if (declared) return declared;
  return extMime ?? "application/octet-stream";
}

export function isMedia(mime: string): boolean {
  return isMediaMime(mime);
}

export function getMediaModality(mime: string): "IMAGE" | "AUDIO" | "VIDEO" {
  if (mime.startsWith("image/")) return "IMAGE";
  if (mime.startsWith("audio/")) return "AUDIO";
  return "VIDEO";
}
