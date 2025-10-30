import { Pinecone } from "@pinecone-database/pinecone";

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!,
});

const dealsIndex = pinecone.index("dac-deals");
const docsIndex = pinecone.index("dac-docs");

export { dealsIndex, docsIndex, pinecone };
