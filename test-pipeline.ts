import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: "https://driving-gull-44260.upstash.io",
  token: "AazkAAIgcDEzNjIxNmQ1N2M4M2U0ZDc0YjYyZjgwZTk4MDcwOWY2MQ",
});

async function test() {
  const mode = "testnet";
  const id = "oloju-kokoro-01ec74d6";
  const pipeline = redis.pipeline();
  pipeline.mget(`meshtab:${mode}:tab:${id}`);
  pipeline.hgetall(`meshtab:${mode}:tab:${id}:members`);
  const results = await pipeline.exec();
  console.log("PIPELINE RESULTS:", JSON.stringify(results, null, 2));
}

test().catch(console.error);
