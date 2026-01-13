"use server";

import { put } from "@vercel/blob";
import { DealType } from "db";
import { revalidatePath } from "next/cache";
import db, { dealDocuments } from "db";

export default async function UploadCim(
  data: FormData,
  dealId: string,
  dealType: DealType,
) {
  const title = data.get("title");
  const caption = data.get("caption");
  const file = data.get("file") as File | null;

  if (!title || !caption || !file) {
    return { success: false, error: "Missing required fields" };
  }

  if (!dealId) {
    return { success: false, error: "Deal ID is required" };
  }

  try {
    // Upload file to Vercel Blob
    const blob = await put(file.name, file, {
      access: "public",
    });

    // Save CIM metadata to database as DealDocument
    const [document] = await db.insert(dealDocuments).values({
      title: title as string,
      caption: caption as string,
      description: caption as string, // Use caption as description too
      category: "OTHER", // Default category, can be changed later
      documentUrl: blob.url,
      fileName: file.name,
      fileType: file.type,
      tags: ["CIM", "SIM"], // Tag as CIM/SIM
      dealId,
    }).returning();

    revalidatePath(`/raw-deals/${dealId}`);

    return { success: true, cim: document };
  } catch (error) {
    console.error("Error uploading CIM:", error);
    return { success: false, error: "Failed to upload CIM" };
  }
}
