import { Queue } from "bullmq";
import redis from "./redis";
import "dotenv/config";

export interface CrawlJobData {
  crawlId: string;
  projectId: string;
  websiteUrl: string;
  pineconeNamespace: string;
}

// Create the crawl queue
export const crawlQueue = new Queue<CrawlJobData>("crawl", {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 5000,
    },
    removeOnComplete: {
      age: 24 * 3600, // Keep completed jobs for 24 hours
      count: 1000,
    },
    removeOnFail: {
      age: 7 * 24 * 3600, // Keep failed jobs for 7 days
    },
  },
});

export default crawlQueue;
