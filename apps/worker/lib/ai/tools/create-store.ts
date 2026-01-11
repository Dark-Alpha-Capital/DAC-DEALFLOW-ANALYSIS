import { googleGenAI } from "../available-models";

export async function createCompanyDueDiligenceDocumentsStore() {
  try {
    const fileSearchStore = await googleGenAI.fileSearchStores.create({
      config: { displayName: "company-due-diligence-documents-store" },
    });

    console.log(fileSearchStore);
  } catch (error) {
    console.log(error);
  }
}

createCompanyDueDiligenceDocumentsStore().catch((error) => {
  console.log(error);
});
