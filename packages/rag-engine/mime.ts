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

export function resolveMimeType(fileName: string, mimeType: string | null): string {
  if (mimeType?.trim()) return mimeType.toLowerCase();
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    pdf: MIME.PDF,
    docx: MIME.DOCX,
    doc: MIME.DOCX,
    txt: MIME.TEXT,
    md: MIME.TEXT,
    csv: MIME.CSV,
    xlsx: MIME.XLSX,
    xls: MIME.XLS,
    json: MIME.JSON,
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    mp3: "audio/mpeg",
    wav: "audio/wav",
    mp4: "video/mp4",
    mov: "video/quicktime",
  };
  return map[ext] ?? "application/octet-stream";
}

export function isMedia(mime: string): boolean {
  return mime.startsWith("image/") || mime.startsWith("audio/") || mime.startsWith("video/");
}

export function getMediaModality(mime: string): "IMAGE" | "AUDIO" | "VIDEO" {
  if (mime.startsWith("image/")) return "IMAGE";
  if (mime.startsWith("audio/")) return "AUDIO";
  return "VIDEO";
}
