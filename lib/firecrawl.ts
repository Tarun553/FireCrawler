// import FirecrawlApp from "@mendable/firecrawl-js";
// import "dotenv/config";

// const FIRECRAWL_API_KEY = process.env.FIRE_CRAWL_APIKEY;
// if (!FIRECRAWL_API_KEY) {
//   throw new Error("FIRE_CRAWL_APIKEY is not defined in environment variables");
// }

// const firecrawl = new FirecrawlApp({ apiKey: FIRECRAWL_API_KEY });

// export default firecrawl;


// lib/firecrawl.ts
import FirecrawlApp from "@mendable/firecrawl-js";
import "dotenv/config";

const FIRECRAWL_API_KEY =
  process.env.FIRECRAWL_API_KEY || process.env.FIRE_CRAWL_APIKEY;

if (!FIRECRAWL_API_KEY) {
  throw new Error(
    "Firecrawl API key missing. Set FIRECRAWL_API_KEY (recommended) or FIRE_CRAWL_APIKEY."
  );
}

export type FirecrawlPage = {
  markdown?: string;
  html?: string;
  metadata?: {
    title?: string;
    sourceURL?: string;
    description?: string;
    statusCode?: number;
    [k: string]: unknown;
  };
  url?: string; // sometimes present depending on version
};

export type FirecrawlCrawlStart = {
  id: string;
  url?: string;
  success?: boolean; // may exist at runtime, but not always in TS types
  error?: string;
};

export type FirecrawlCrawlStatus = {
  status: "scraping" | "completed" | "failed";
  total?: number;
  completed?: number;
  creditsUsed?: number;
  expiresAt?: string;
  next?: string; // URL to fetch the next chunk of data
  data?: FirecrawlPage[];
  error?: string;
};

export const firecrawl = new FirecrawlApp({ apiKey: FIRECRAWL_API_KEY });

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchNext(nextUrl: string): Promise<FirecrawlCrawlStatus> {
  const res = await fetch(nextUrl, {
    headers: {
      Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
    },
  });

  if (!res.ok) {
    throw new Error(`Firecrawl next-page fetch failed: ${res.status} ${res.statusText}`);
  }

  return (await res.json()) as FirecrawlCrawlStatus;
}

/**
 * Start a crawl job and return its job id.
 * We cast to FirecrawlCrawlStart because SDK TS types may be incomplete.
 */
export async function startCrawl(url: string, limit = 100): Promise<FirecrawlCrawlStart> {
  const job = (await (firecrawl as any).crawl(url, {
    limit,
    scrapeOptions: { formats: ["markdown"] },
  })) as FirecrawlCrawlStart;

  if (!job?.id) {
    throw new Error(`Firecrawl crawl start failed: ${job?.error ?? "No job id returned"}`);
  }

  return job;
}

/**
 * Poll crawl status until completed and return ALL pages (handles `next` pagination).
 */
export async function waitForCrawlAllPages(jobId: string): Promise<FirecrawlPage[]> {
  const all: FirecrawlPage[] = [];

  while (true) {
    const status = (await (firecrawl as any).getCrawlStatus(jobId)) as FirecrawlCrawlStatus;

    if (status.status === "failed") {
      throw new Error(`Firecrawl crawl failed: ${status.error ?? "Unknown error"}`);
    }

    if (Array.isArray(status.data)) all.push(...status.data);

    // Drain paginated chunks if present
    let next = status.next;
    while (next) {
      const nextChunk = await fetchNext(next);
      if (Array.isArray(nextChunk.data)) all.push(...nextChunk.data);
      next = nextChunk.next;
    }

    if (status.status === "completed") break;

    await sleep(2000);
  }

  return all;
}

