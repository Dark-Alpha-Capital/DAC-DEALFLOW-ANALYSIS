import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { UserRole } from "@repo/db/schema";
import { ImageIcon } from "lucide-react";

export const adminEmails = [
  "rahul@darkalphacapital.com",
  "gaurav@darkalphacapital.com",
  "destiny@darkalphacapital.com",
  "daigbe@darkalphacapital.com",
  "diligence@darkalphacapital.com",
  "da@darkalphacapital.com",
];

export const formatPercent = (value: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value);
};

export function getFileIcon(type: string) {
  if (type.startsWith("image/")) return ImageIcon;
  if (type.startsWith("video/")) return File;
  if (type.startsWith("audio/")) return File;
  if (type.includes("pdf") || type.includes("document")) return File;
  if (type.includes("zip") || type.includes("rar")) return File;
  return File;
}

export function formatFileSize(bytes: number) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return (
    Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  );
}

export function cleanStr(val?: string | null): string {
  if (!val) return "";
  const s = String(val).trim();
  return s.toLowerCase() === "nan" ? "" : s;
}

export function cleanNum(val?: string | number | null): number | null {
  if (val === undefined || val === null) return null;
  const s = String(val).trim();
  if (s.toLowerCase() === "nan" || s === "") return null;
  const digits = s.replace(/[^\d]/g, "");
  return digits ? Number(digits) : null;
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const fetcher = (...args: Parameters<typeof fetch>) =>
  fetch(...args).then((res) => res.json());

export function formatCurrency(value: number): string {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "—";

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
    notation: "standard",
  }).format(numeric);
}

const ALLOWED_HTTP_PROTOCOLS = new Set(["http:", "https:"]);
const STABLE_DATE_LOCALE = "en-US";
const STABLE_DATE_TIME_ZONE = "UTC";

type DateInput = Date | string | number;

function toValidDate(value: DateInput | null | undefined): Date | null {
  if (value == null) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function sanitizeHttpUrl(value?: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  try {
    const parsed = new URL(trimmed);
    if (!ALLOWED_HTTP_PROTOCOLS.has(parsed.protocol)) {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

export function formatDateStable(
  value: DateInput | null | undefined,
  fallback: string = "—",
): string {
  const date = toValidDate(value);
  if (!date) return fallback;

  return new Intl.DateTimeFormat(STABLE_DATE_LOCALE, {
    timeZone: STABLE_DATE_TIME_ZONE,
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(date);
}

export function formatDateTimeStable(
  value: DateInput | null | undefined,
  fallback: string = "—",
): string {
  const date = toValidDate(value);
  if (!date) return fallback;

  return new Intl.DateTimeFormat(STABLE_DATE_LOCALE, {
    timeZone: STABLE_DATE_TIME_ZONE,
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);
}

export function calculateEbitdaMargin(ebitda: number, revenue: number) {
  if (revenue === 0) return 0;
  return ebitda / revenue;
}

export function formatNumberWithCommas(x: string) {
  if (!x) return "";
  // Remove all non-digit characters (except dot for decimals)
  const parts = x.replace(/,/g, "").split(".");
  parts[0] = parts[0]?.replace(/\B(?=(\d{3})+(?!\d))/g, ",") || "";
  return parts.join(".");
}

// Remove commas for search
export function unformatNumber(x: string) {
  return x.replace(/,/g, "");
}

/**
 * determine the role of the user based on their email
 *
 * @param userEmail - the email of the user
 * @returns the role of the user
 */
export function determineRole(userEmail: string): UserRole {
  if (adminEmails.includes(userEmail)) {
    return UserRole.ADMIN;
  } else {
    return UserRole.USER;
  }
}

export async function splitContentIntoChunks(
  transcript: string,
  chunkSize: number = 7000,
  overlap: number = 1000,
): Promise<string[]> {
  const words = transcript.split(" ");
  const chunks: string[] = [];
  let currentChunk: string[] = [];
  let currentLength = 0;

  for (const word of words) {
    if (currentLength + word.length > chunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.join(" "));
      // Keep last few words for overlap
      const overlapWords = currentChunk.slice(-Math.floor(overlap / 10));
      currentChunk = [...overlapWords];
      currentLength = overlapWords.join(" ").length;
    }
    currentChunk.push(word);
    currentLength += word.length + 1; // +1 for space
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk.join(" "));
  }

  return chunks;
}
