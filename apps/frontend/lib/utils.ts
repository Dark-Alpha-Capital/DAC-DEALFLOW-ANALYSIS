import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { UserRole } from "@prisma/client";
import { ImageIcon } from "lucide-react";

export const adminEmails = [
  "rg5353070@gmail.com",
  "amani.151413@gmail.com",
  "rahul@darkalphacapital.com",
  "destiny@darkalphacapital.com",
  "daigbe@darkalphacapital.com",
  "diligence@darkalphacapital.com",
  "da@darkalphacapital.com",
  "daigbe@gmail.com",
];

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
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
    notation: value >= 1000000 ? "compact" : "standard",
    compactDisplay: "short",
  }).format(value);
}

export function formatNumberWithCommas(x: string) {
  if (!x) return "";
  // Remove all non-digit characters (except dot for decimals)
  const parts = x.replace(/,/g, "").split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
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
export function determineRole(userEmail: string) {
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
