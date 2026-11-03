import { initializeBlobBuckets } from "../packages/application/dist/index.js";

let ready = false;
for (let attempt = 0; attempt < 20; attempt++) {
  try {
    await initializeBlobBuckets({
      // biome-ignore lint/suspicious/noUndeclaredEnvVars: Administrative/one-shot script runs outside Turbo.
      endpoint: process.env.STORAGE_ENDPOINT,
      // biome-ignore lint/suspicious/noUndeclaredEnvVars: Administrative/one-shot script runs outside Turbo.
      accessKey: process.env.STORAGE_ACCESS_KEY,
      // biome-ignore lint/suspicious/noUndeclaredEnvVars: Administrative/one-shot script runs outside Turbo.
      secretKey: process.env.STORAGE_SECRET_KEY,
      buckets: ["fitloom-dev", "fitloom-test"],
    });
    ready = true;
    break;
  } catch {
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}
if (!ready) throw new Error("Private storage initialization unavailable");
console.log("Development and test private storage buckets ready");
