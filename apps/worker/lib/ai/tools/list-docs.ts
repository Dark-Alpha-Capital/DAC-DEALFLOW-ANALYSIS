import { COMPANY_DUE_DILIGENCE_DOCUMENTS_STORE_NAME } from "../available-models";

/**
 * Lists all Documents in a FileSearchStore.
 *
 * NOTE: This function assumes you have a Google Auth client initialized and
 * can make authenticated requests to the Generative Language API.
 * The `fetch` implementation here is conceptual and would typically use a
 * library like 'axios' or the Google API Client Library.
 *
 * @param {string} storeId The ID of your FileSearchStore (e.g., 'my-store-123').
 * @param {number} maxPages Optional. The maximum number of pages to fetch. Defaults to 5.
 * @returns {Promise<Array<Object>>} A promise that resolves to an array of Document objects.
 */
async function listFileSearchStoreDocuments(storeId: string, maxPages = 5) {
  const allDocuments = [];
  let nextPageToken = null;
  let pageCount = 0;

  // The base URL for the Documents API
  const baseUrl = "https://generativelanguage.googleapis.com/v1beta";

  // The resource name format: fileSearchStores/{filesearchstore}
  const parentName = storeId;

  console.log(`Starting document listing for store: ${storeId}`);

  while (pageCount < maxPages) {
    pageCount++;

    // Construct the URL with query parameters
    let url = `${baseUrl}/${parentName}/documents?pageSize=20&key=${process.env.GOOGLE_AI_API_KEY}`; // Max page size is 20
    if (nextPageToken) {
      url += `&pageToken=${nextPageToken}`;
    }

    try {
      // 1. Make the API request
      const response = await fetch(url, {
        method: "GET",
        headers: {
          //   Authorization: `Bearer ${ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`API request failed with status: ${response.status}`);
      }

      // 2. Parse the JSON response
      const data = (await response.json()) as {
        documents: {
          id: string;
          displayName: string;
          mimeType: string;
          sizeBytes: number;
        }[];
        nextPageToken: string | null;
      };

      // 3. Add fetched documents to the master list
      if (data.documents && data.documents.length > 0) {
        allDocuments.push(...data.documents);
        console.log(
          `Fetched ${data.documents.length} documents on page ${pageCount}.`
        );
      } else {
        console.log(`No documents found on page ${pageCount}.`);
      }

      // 4. Check for the next page token for pagination
      nextPageToken = data.nextPageToken;

      if (!nextPageToken) {
        console.log("--- Finished listing: No more pages to fetch. ---");
        break; // Exit the loop if there are no more pages
      }

      if (pageCount >= maxPages) {
        console.log(
          `--- Reached maximum page limit of ${maxPages}. Stopping. ---`
        );
        break;
      }
    } catch (error) {
      console.log(error);

      console.error(
        "Error listing documents:",
        error instanceof Error ? error.message : String(error)
      );
      break; // Stop on error
    }
  }

  console.log(`Total documents retrieved: ${allDocuments.length}`);
  return allDocuments;
}

// --- EXAMPLE USAGE ---
//fileSearchStores/companyduediligencedocument-ote1yx8yepjw

// IMPORTANT: Replace 'YOUR_ACCESS_TOKEN' inside the function with real logic.
// In a server environment (Node.js), you'd typically use service account credentials.
// In a client environment, you would use an OAuth flow.

listFileSearchStoreDocuments(COMPANY_DUE_DILIGENCE_DOCUMENTS_STORE_NAME)
  .then((documents) => {
    console.log("Successfully retrieved documents:", documents);
    documents.forEach((doc) => console.log(doc.displayName));
  })
  .catch((error) => {
    console.error("Failed to execute document listing process:", error);
  });
