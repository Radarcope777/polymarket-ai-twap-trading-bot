import { loadConfig } from "./config/index.js";
import { TradingEngine } from "./core/engine.js";

async function main(): Promise<void> {
  const config = loadConfig();
  const engine = new TradingEngine(config);

  const shutdown = async () => {
    await engine.stop();
    process.exit(0);
  };

  process.on("SIGINT", () => void shutdown());
  process.on("SIGTERM", () => void shutdown());

  await engine.start();
}

main().catch((error) => {
  console.error("Fatal error:", error instanceof Error ? error.message : error);
  process.exit(1);
});
