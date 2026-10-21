import fs from "fs";
import { Redis } from "@upstash/redis";

const redisUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

if (!redisUrl || !redisToken) {
  console.error("Missing Redis credentials in environment / .env.local");
  process.exit(1);
}

const redis = new Redis({ url: redisUrl, token: redisToken });

async function pull() {
  console.log("Pulling latest data from Upstash KV...");
  const hist = await redis.get("fpt_history");
  if (hist) {
    fs.writeFileSync("src/app/data/history.json", JSON.stringify(hist, null, 2), "utf8");
    console.log("✅ Synced fpt_history -> src/app/data/history.json");
  }
  const lb = await redis.get("fpt_leaderboard");
  if (lb) {
    fs.writeFileSync("src/app/data/leaderboard.json", JSON.stringify(lb, null, 2), "utf8");
    console.log("✅ Synced fpt_leaderboard -> src/app/data/leaderboard.json");
  }
  console.log("🎉 Pull complete!");
}

pull().catch(console.error);
