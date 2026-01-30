// import { Worker, Job } from "bullmq";
// import { CrawlJobData } from "../lib/queue";
// import redis from "../lib/redis";
// import firecrawl from "../lib/firecrawl";
// import { embeddingModel } from "../lib/gemini";
// import { pineconeIndex } from "../lib/pinecone";
// import { prisma } from "../lib/prisma";
// import "dotenv/config";

// // Text chunking utility - splits text into chunks with overlap
// function chunkText(text: string, chunkSize = 1000, overlap = 200): string[] {
//   const chunks: string[] = [];
//   let start = 0;

//   while (start < text.length) {
//     const end = Math.min(start + chunkSize, text.length);
//     chunks.push(text.slice(start, end));
//     start += chunkSize - overlap;
//   }

//   return chunks;
// }

// // Process crawl job
// async function processCrawlJob(job: Job<CrawlJobData>) {
//   const { crawlId, projectId, websiteUrl, pineconeNamespace } = job.data;

//   console.log(`[Worker] Processing crawl job ${crawlId} for ${websiteUrl}`);

//   try {
//     // Update crawl status to PROCESSING
//     await prisma.crawl.update({
//       where: { id: crawlId },
//       data: {
//         status: "PROCESSING",
//         startedAt: new Date(),
//       },
//     });

//     // Crawl the website using Firecrawl
//     console.log(`[Worker] Crawling ${websiteUrl}...`);
//     const crawlResponse = await firecrawl.crawl(websiteUrl, {
//       limit: 100, // Max pages to crawl
//       scrapeOptions: {
//         formats: ["markdown"],
//       },
//     });

//     if (!crawlResponse.succes) {
//       throw new Error(`Firecrawl failed: ${crawlResponse.error}`);
//     }

//     const pages = crawlResponse.data || [];
//     console.log(`[Worker] Crawled ${pages.length} pages`);

//     // Process each page
//     const vectors: any[] = [];

//     for (const page of pages) {
//       const content = page.markdown || "";
//       const url = page.url || "";
//       const title = page.metadata?.title || url;

//       if (!content) continue;

//       // Chunk the content
//       const chunks = chunkText(content);

//       for (let i = 0; i < chunks.length; i++) {
//         const chunk = chunks[i];

//         // Generate embedding using Gemini
//         const embeddingResult = await embeddingModel.embedContent(chunk);
//         const embedding = embeddingResult.embedding.values;

//         // Prepare vector for Pinecone
//         vectors.push({
//           id: `${crawlId}-${url}-${i}`,
//           values: embedding,
//           metadata: {
//             projectId,
//             crawlId,
//             url,
//             title,
//             content: chunk,
//             chunkIndex: i,
//           },
//         });
//       }
//     }

//     // Store vectors in Pinecone
//     if (vectors.length > 0) {
//       console.log(`[Worker] Upserting ${vectors.length} vectors to Pinecone...`);
//       const namespace = pineconeIndex.namespace(pineconeNamespace);

//       // Batch upsert (Pinecone recommends batches of 100)
//       const batchSize = 100;
//       for (let i = 0; i < vectors.length; i += batchSize) {
//         const batch = vectors.slice(i, i + batchSize);
//         await namespace.upsert(batch);
//       }
//     }

//     // Update crawl status to COMPLETED
//     await prisma.crawl.update({
//       where: { id: crawlId },
//       data: {
//         status: "COMPLETED",
//         pagesCount: pages.length,
//         finishedAt: new Date(),
//       },
//     });

//     // Update project status to READY
//     await prisma.project.update({
//       where: { id: projectId },
//       data: {
//         status: "READY",
//       },
//     });

//     console.log(`[Worker] Crawl job ${crawlId} completed successfully`);
//   } catch (error: unknown) {
//     console.error(`[Worker] Crawl job ${crawlId} failed:`, error);

//     // Update crawl status to FAILED
//     await prisma.crawl.update({
//       where: { id: crawlId },
//       data: {
//         status: "FAILED",
//         error: error instanceof Error ? error.message : "Unknown error",
//         finishedAt: new Date(),
//       },
//     });

//     // Update project status to FAILED
//     await prisma.project.update({
//       where: { id: projectId },
//       data: {
//         status: "FAILED",
//       },
//     });

//     throw error; // Re-throw to let BullMQ handle retries
//   }
// }

// // Create the worker
// const worker = new Worker<CrawlJobData>("crawl", processCrawlJob, {
//   connection: redis,
//   concurrency: 2, // Process up to 2 jobs concurrently
// });

// // Event listeners
// worker.on("completed", (job) => {
//   console.log(`[Worker] Job ${job.id} completed`);
// });

// worker.on("failed", (job, err) => {
//   console.error(`[Worker] Job ${job?.id} failed:`, err.message);
// });

// worker.on("error", (err) => {
//   console.error("[Worker] Error:", err);
// });

// console.log("[Worker] Crawl worker started and waiting for jobs...");

// // Graceful shutdown
// process.on("SIGTERM", async () => {
//   console.log("[Worker] SIGTERM received, closing worker...");
//   await worker.close();
//   process.exit(0);
// });

// process.on("SIGINT", async () => {
//   console.log("[Worker] SIGINT received, closing worker...");
//   await worker.close();
//   process.exit(0);
// });

import { Worker, Job } from "bullmq";
import crypto from "crypto";
import "dotenv/config";

import { CrawlJobData } from "../lib/queue";
import redis from "../lib/redis";
import { startCrawl, waitForCrawlAllPages } from "../lib/firecrawl";
import { embeddingModel } from "../lib/gemini";
import { pineconeIndex } from "../lib/pinecone";
import { prisma } from "../lib/prisma";

function chunkText(text: string, chunkSize = 1000, overlap = 200): string[] {
  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    chunks.push(text.slice(start, end));
    start += Math.max(1, chunkSize - overlap);
  }

  return chunks;
}

function stableId(crawlId: string, url: string, chunkIndex: number) {
  const urlHash = crypto.createHash("sha1").update(url).digest("hex");
  return `${crawlId}-${urlHash}-${chunkIndex}`;
}

// Retry function with exponential backoff
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 5,
  initialDelay = 2000
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      // Check if it's a retryable error (500, rate limit, etc.)
      const isRetryable = 
        error.status === 500 || 
        error.status === 429 || 
        error.status === 503 ||
        error.message?.includes("Internal Server Error") ||
        error.message?.includes("retry");
      
      if (!isRetryable || attempt >= maxRetries - 1) {
        throw error;
      }
      
      const delay = initialDelay * Math.pow(2, attempt);
      console.log(`[Worker] API error (${error.status}), retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

async function processCrawlJob(job: Job<CrawlJobData>) {
  const { crawlId, projectId, websiteUrl, pineconeNamespace } = job.data;

  console.log(`[Worker] Processing crawl job ${crawlId} for ${websiteUrl}`);

  try {
    await prisma.crawl.update({
      where: { id: crawlId },
      data: { status: "PROCESSING", startedAt: new Date() },
    });

    console.log(`[Worker] Starting crawl for ${websiteUrl}...`);
    const crawlJob = await startCrawl(websiteUrl, 100);

    console.log(`[Worker] Crawl started: ${crawlJob.id}`);
    const pages = await waitForCrawlAllPages(crawlJob.id);

    console.log(`[Worker] Crawled ${pages.length} pages`);

    const vectors: Array<{
      id: string;
      values: number[];
      metadata: Record<string, any>;
    }> = [];

    for (const page of pages) {
      const content = page.markdown ?? "";
      const url = page.metadata?.sourceURL ?? page.url ?? websiteUrl;
      const title = page.metadata?.title ?? url;

      if (!content.trim()) continue;

      const chunks = chunkText(content);

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];

        // Retry embedding generation with exponential backoff
        const embeddingResult = await retryWithBackoff(
          () => embeddingModel.embedContent(chunk)
        );
        const embedding: number[] | undefined = embeddingResult?.embedding?.values;

        if (!embedding || !Array.isArray(embedding)) {
          throw new Error("Embedding result missing embedding.values");
        }
        if (embedding.length !== 768) {
          throw new Error(`Unexpected embedding dimension: ${embedding.length} (expected 768)`);
        }

        vectors.push({
          id: stableId(crawlId, url, i),
          values: embedding,
          metadata: {
            projectId,
            crawlId,
            url,
            title,
            content: chunk,
            chunkIndex: i,
          },
        });
        
        // Add small delay between API calls to avoid rate limiting
        if (i < chunks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    }

    if (vectors.length > 0) {
      console.log(`[Worker] Upserting ${vectors.length} vectors to Pinecone...`);
      const namespace = pineconeIndex.namespace(pineconeNamespace);

      const batchSize = 100;
      for (let i = 0; i < vectors.length; i += batchSize) {
        await namespace.upsert(vectors.slice(i, i + batchSize));
      }
    }

    await prisma.crawl.update({
      where: { id: crawlId },
      data: {
        status: "COMPLETED",
        pagesCount: pages.length,
        finishedAt: new Date(),
      },
    });

    await prisma.project.update({
      where: { id: projectId },
      data: { status: "READY" },
    });

    console.log(`[Worker] Crawl job ${crawlId} completed successfully`);
  } catch (error: unknown) {
    console.error(`[Worker] Crawl job ${crawlId} failed:`, error);

    await prisma.crawl.update({
      where: { id: crawlId },
      data: {
        status: "FAILED",
        error: error instanceof Error ? error.message : "Unknown error",
        finishedAt: new Date(),
      },
    });

    await prisma.project.update({
      where: { id: projectId },
      data: { status: "FAILED" },
    });

    throw error;
  }
}

const worker = new Worker<CrawlJobData>("crawl", processCrawlJob, {
  connection: redis,
  concurrency: 1, // Process one job at a time to avoid API rate limits
});

worker.on("completed", (job) => console.log(`[Worker] Job ${job.id} completed`));
worker.on("failed", (job, err) =>
  console.error(`[Worker] Job ${job?.id} failed:`, err.message)
);
worker.on("error", (err) => console.error("[Worker] Error:", err));

console.log("[Worker] Crawl worker started and waiting for jobs...");

async function shutdown(signal: string) {
  console.log(`[Worker] ${signal} received, closing worker...`);
  await worker.close();
  process.exit(0);
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
