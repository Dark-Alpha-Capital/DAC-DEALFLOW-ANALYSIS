import {
  googleGenAI,
  COMPANY_DUE_DILIGENCE_DOCUMENTS_STORE_NAME,
} from "../available-models";

/**
 * Deletes a FileSearchStore from Google's File Search API.
 *
 * According to the API documentation, the delete method accepts:
 * - name (required): The resource name of the FileSearchStore
 * - force (optional query parameter): If true, deletes all Documents and related objects.
 *   If false (default), returns FAILED_PRECONDITION error if store contains Documents.
 *
 * Note: The SDK TypeScript types may not include the `force` parameter yet.
 * If you need to force delete documents, you may need to delete them first or use the REST API directly.
 *
 * @param storeName - The resource name of the FileSearchStore to delete.
 *   Defaults to COMPANY_DUE_DILIGENCE_DOCUMENTS_STORE_NAME.
 * @returns Promise that resolves when the store is deleted
 */
export async function deleteStore(
  storeName: string = COMPANY_DUE_DILIGENCE_DOCUMENTS_STORE_NAME
) {
  try {
    console.log(`Deleting FileSearchStore: ${storeName}`);

    await googleGenAI.fileSearchStores.delete({
      name: storeName,
      config: {
        force: true,
      },
    });

    console.log(`Successfully deleted FileSearchStore: ${storeName}`);
  } catch (error) {
    console.error(`Failed to delete FileSearchStore ${storeName}:`, error);
    throw error;
  }
}

// Uncomment to run directly:
deleteStore().catch((error) => {
  console.error(error);
  process.exit(1);
});
