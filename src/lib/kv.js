import { Redis } from "@upstash/redis";

const redisUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

let redisClient = null;

if (redisUrl && redisToken) {
  try {
    redisClient = new Redis({
      url: redisUrl,
      token: redisToken,
    });
  } catch (err) {
    console.warn("Failed to initialize Upstash Redis client:", err);
  }
}

export function isKVConfigured() {
  return Boolean(redisClient);
}

/**
 * Get data from Upstash KV or fallback to a local read function.
 * If data is not yet in KV but found in fallback, seed KV automatically.
 */
export async function getKVData(key, fallbackReadFn) {
  if (redisClient) {
    try {
      const data = await redisClient.get(key);
      if (data !== null && data !== undefined) {
        return data;
      }
      // Seed KV with initial local data if key doesn't exist yet
      if (typeof fallbackReadFn === "function") {
        const localData = fallbackReadFn();
        if (localData !== null && localData !== undefined) {
          await redisClient.set(key, localData);
          return localData;
        }
      }
    } catch (err) {
      console.error(`Error reading ${key} from KV, falling back to local:`, err);
    }
  }
  return typeof fallbackReadFn === "function" ? fallbackReadFn() : null;
}

/**
 * Save data to Upstash KV and also attempt local write (if filesystem is writable).
 */
export async function saveKVData(key, data, fallbackWriteFn) {
  if (redisClient) {
    try {
      await redisClient.set(key, data);
    } catch (err) {
      console.error(`Error saving ${key} to KV:`, err);
    }
  }

  // Attempt local write (works in localhost/VPS, gracefully skips read-only errors on Vercel)
  if (typeof fallbackWriteFn === "function") {
    try {
      fallbackWriteFn(data);
    } catch (err) {
      if (err.code !== "EROFS") {
        console.error(`Local write error for ${key}:`, err);
      }
    }
  }
}
