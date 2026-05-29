import "dotenv/config";
import { spawn } from "child_process";
import path from "path";

const docIds = process.argv.slice(2);
if (docIds.length === 0) {
  console.error("Usage: regenerate-explanations-batch.ts <docId> [docId...]");
  process.exit(1);
}

function runOne(docId: string): Promise<number> {
  return new Promise((resolve) => {
    const script = path.join(process.cwd(), "scripts", "regenerate-explanations.ts");
    const isWin = process.platform === "win32";
    const child = spawn(
      isWin ? "npx.cmd" : "npx",
      ["tsx", "--import", "dotenv/config", script, docId],
      {
        cwd: process.cwd(),
        stdio: "inherit",
        env: process.env,
        shell: isWin,
      },
    );
    child.on("close", (code) => resolve(code ?? 1));
  });
}

async function main() {
  for (const docId of docIds) {
    console.log("\n==========", docId, "==========\n");
    const code = await runOne(docId);
    if (code !== 0) {
      console.error("Failed for", docId, "exit", code);
      process.exit(code);
    }
  }
  console.log("\nAll documents complete.");
}

main();
