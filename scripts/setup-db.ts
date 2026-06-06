import { config } from "dotenv";
import { execSync } from "node:child_process";
import { resolve } from "node:path";
import pg from "pg";

config({ path: resolve(process.cwd(), ".env") });

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set in .env");
  process.exit(1);
}

async function waitForDb(maxAttempts = 12) {
  for (let i = 1; i <= maxAttempts; i++) {
    const pool = new pg.Pool({
      connectionString: url,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 20_000,
    });
    try {
      await pool.query("SELECT 1");
      await pool.end();
      console.log(`Database reachable (attempt ${i}).`);
      return;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`Attempt ${i}/${maxAttempts} failed: ${msg}`);
      await pool.end().catch(() => undefined);
      if (i < maxAttempts) {
        console.log("Waiting 5s (Render DB may be waking up)...");
        await new Promise((r) => setTimeout(r, 5000));
      }
    }
  }
  throw new Error(
    "Could not connect to PostgreSQL. Open Render dashboard and confirm the database is Available.",
  );
}

async function main() {
  console.log("Waiting for PostgreSQL...");
  await waitForDb();

  console.log("Applying migrations...");
  try {
    execSync("npx prisma migrate deploy", { stdio: "inherit" });
  } catch {
    console.log("Retrying after resolving failed migration (if any)...");
    execSync("npx prisma migrate resolve --rolled-back 0_init", {
      stdio: "inherit",
    });
    execSync("npx prisma migrate deploy", { stdio: "inherit" });
  }

  console.log("Seeding demo data...");
  execSync("npx tsx prisma/seed.ts", { stdio: "inherit" });

  console.log("\nSetup complete. Demo login: admin@tigerparent.local / demo1234");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
