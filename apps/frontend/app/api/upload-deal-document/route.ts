import { getSession } from "@/lib/auth-server";
import { dealDocumentFormSchema } from "@/lib/schemas";
import { put } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import db, { dealDocuments } from "db";

export async function POST(request: NextRequest) {
  const userSession = await getSession();

  if (!userSession?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const title = formData.get("title");
  const description = formData.get("description");
  const category = formData.get("category");
  const file = formData.get("file");
  const dealId = formData.get("dealId");
  const tagsJson = formData.get("tags");

  if (!title || !description || !category || !file || !dealId) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 },
    );
  }

  if (!dealId) {
    return NextResponse.json({ error: "Deal ID is required" }, { status: 400 });
  }

  // Parse tags if provided
  let tags: string[] = [];
  if (tagsJson) {
    try {
      tags = JSON.parse(tagsJson as string);
    } catch (e) {
      // If parsing fails, treat as empty array
      tags = [];
    }
  }

  const validatedData = dealDocumentFormSchema.safeParse({
    title,
    description,
    category,
    file,
    tags,
  });

  if (!validatedData.success) {
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  }

  let blobUrl: string;

  try {
    const blob = await put(
      validatedData.data.file.name,
      validatedData.data.file,
      {
        access: "public",
      },
    );
    blobUrl = blob.url;
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 },
    );
  }

  // Save document metadata to database

  try {
    const fileObj = validatedData.data.file;
    const [dealDocument] = await db.insert(dealDocuments).values({
      title: validatedData.data.title,
      description: validatedData.data.description,
      category: validatedData.data.category,
      documentUrl: blobUrl,
      fileName: fileObj.name,
      fileType: fileObj.type,
      tags: validatedData.data.tags || [],
      dealId: dealId as string,
    }).returning();

    revalidatePath(`/raw-deals/${dealId}`);

    return NextResponse.json({ success: true, dealDocument });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to save deal document" },
      { status: 500 },
    );
  }
}
