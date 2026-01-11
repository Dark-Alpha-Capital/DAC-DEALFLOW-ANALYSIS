import { COMPANY_DUE_DILIGENCE_DOCUMENTS_STORE_NAME } from "../available-models";

/**
 * Deletes a specific Document from a FileSearchStore.
 *
 * @param documentName The full document name path (e.g., 'COMPANY_DUE_DILIGENCE_DOCUMENTS_STORE_NAME/documents/humza-resume-wnf16gxlad8r')
 * @returns A promise that resolves to true if the deletion was successful.
 */
export async function deleteCompanyDueDiligenceDocument(
  documentName: string
): Promise<boolean> {
  // Extract store ID and document ID from the full path
  // Format: fileSearchStores/{storeId}/documents/{documentId}
  const parts = documentName.split("/");

  if (
    parts.length < 4 ||
    parts[0] !== "fileSearchStores" ||
    parts[2] !== "documents"
  ) {
    console.error(`Invalid documentName format: ${documentName}`);
    return false;
  }

  const storeId = parts[1];
  const documentId = parts.slice(3).join("/"); // In case document ID contains slashes

  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

  if (!GEMINI_API_KEY) {
    console.error("GEMINI_API_KEY is not set");
    return false;
  }

  let url = `https://generativelanguage.googleapis.com/v1beta/fileSearchStores/${storeId}/documents/${documentId}?key=${GEMINI_API_KEY}`;
  console.log(
    `Attempting to delete document from FileSearchStore: ${documentId}`
  );

  try {
    const response = await fetch(url, {
      method: "DELETE",
    });

    if (response.ok) {
      console.log(
        `✅ Document '${documentId}' deleted successfully from FileSearchStore.`
      );
      return true;
    } else {
      // Handle API error response
      const errorData = await response.json().catch(() => ({}));
      console.error(
        `❌ FileSearchStore deletion failed with status: ${response.status}`
      );
      console.error("Error Details:", errorData);
      return false;
    }
  } catch (error) {
    console.error("An error occurred during FileSearchStore deletion:", error);
    return false;
  }
}
