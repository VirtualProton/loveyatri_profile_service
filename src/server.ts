// import "./lib/zod-openapi.js"; // MUST be first
import { buildApp } from "./app.js";
import { env } from "./config/env.js";

async function startServer() {
  try {
    const app = buildApp();

    await (await app).listen({
      port: env.PORT,
      host: "0.0.0.0"
    });

    console.log(`🚀 Auth Service running on port ${env.PORT}`);
  } catch (err) {
    console.error("❌ Failed to start Auth Service", err);
    process.exit(1);
  }
}

startServer();
