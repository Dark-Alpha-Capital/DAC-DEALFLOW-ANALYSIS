import { googleGenAI } from "../available-models";

async function listStores() {
  const fileSearchStores = await googleGenAI.fileSearchStores.list();
  for await (const store of fileSearchStores) {
    console.log(store);
  }
}

listStores().catch((error) => {
  console.error(error);
});
