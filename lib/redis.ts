import Redis from "ioredis";
import "dotenv/config";

declare global {
  // eslint-disable-next-line no-var
  var redis: Redis | undefined;
}

const REDIS_URL = process.env.REDIS_URL;
if (!REDIS_URL) {
  throw new Error("REDIS_URL is not defined in environment variables");
}

const redis =
  global.redis ??
  new Redis(REDIS_URL, {
    maxRetriesPerRequest: null, // Required for BullMQ
    retryStrategy(times) {
      return Math.min(times * 50, 2000);
    },
  });

if (!global.redis) {
  redis.on("connect", () => console.log("Redis connected"));
  redis.on("ready", () => console.log("Redis ready"));
  redis.on("error", (err) => console.error("Redis error:", err));
}

global.redis = redis;

export default redis;
