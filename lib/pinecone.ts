import { Pinecone } from "@pinecone-database/pinecone";
import "dotenv/config";

const PINECONE_API_KEY = process.env.PINECONE_DB;
if (!PINECONE_API_KEY) {
  throw new Error("PINECONE_DB is not defined in environment variables");
}

const PINECONE_INDEX_NAME = process.env.PINECONE_INDEX_NAME || "firecrawl";

const pinecone = new Pinecone({
  apiKey: PINECONE_API_KEY,
});

// Get the index instance
export const pineconeIndex = pinecone.index(PINECONE_INDEX_NAME);

export default pinecone;
