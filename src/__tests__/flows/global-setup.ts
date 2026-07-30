import { execSync, spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import net from "node:net";

const DB_FILE = "test-flows.db";
const PORT = 3456;

let serverProcess: ChildProcess | null = null;

function freePort(): Promise<void> {
  return new Promise((resolve) => {
    const s = net.createServer();
    s.listen(PORT, () => s.close(() => resolve()));
    s.on("error", () => {
      try { execSync(`fuser -k ${PORT}/tcp 2>/dev/null || true`); } catch { /* ignore */ }
      setTimeout(resolve, 500);
    });
  });
}

export async function setup(): Promise<void> {
  const cwd = process.cwd();
  const dbPath = path.join(cwd, DB_FILE);

  // Clean and copy seeded DB
  if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
  for (const ext of ["-wal", "-shm"]) {
    const p = dbPath + ext;
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }

  const sourceDb = path.join(cwd, "dev.db");
  if (fs.existsSync(sourceDb)) {
    fs.copyFileSync(sourceDb, dbPath);
    console.log("[flows] Copied dev.db → test-flows.db");
  } else {
    console.warn("[flows] dev.db not found — running seed...");
    execSync("npx tsx prisma/seed.ts", {
      cwd,
      env: { ...process.env, DATABASE_URL: `file:${dbPath}`, AUTH_SECRET: process.env.AUTH_SECRET || "test-secret" },
      stdio: "inherit",
    });
  }

  await freePort();

  process.env.FLOW_TEST_BASE_URL = `http://localhost:${PORT}`;
  process.env.FLOW_TEST_PORT = String(PORT);

  // Start Next.js dev server
  serverProcess = spawn("npx", ["next", "dev", "--port", String(PORT)], {
    cwd,
    env: {
      ...process.env,
      DATABASE_URL: `file:${dbPath}`,
      AUTH_SECRET: process.env.AUTH_SECRET || "test-secret",
      NODE_ENV: "development",
    },
    stdio: "pipe",
    shell: true,
  });

  // Wait for server to be ready
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("Next.js dev server failed to start within 60s"));
    }, 60_000);

    const onData = (chunk: Buffer) => {
      const text = chunk.toString();
      if (text.includes("Local:") || text.includes(`localhost:${PORT}`) || text.includes("Ready in")) {
        clearTimeout(timeout);
        resolve();
      }
    };

    serverProcess!.stdout?.on("data", onData);
    serverProcess!.stderr?.on("data", onData);
    serverProcess!.on("error", reject);
    serverProcess!.on("exit", (code) => {
      if (code !== null && code !== 0) {
        clearTimeout(timeout);
        reject(new Error(`Next.js dev server exited with code ${code}`));
      }
    });
  });

  console.log(`[flows] Next.js server ready on http://localhost:${PORT}`);
}

export async function teardown(): Promise<void> {
  if (serverProcess) {
    serverProcess.kill("SIGTERM");
    try { serverProcess.kill("SIGKILL"); } catch { /* ignore */ }
    serverProcess = null;
  }

  try { execSync(`fuser -k ${PORT}/tcp 2>/dev/null || true`); } catch { /* ignore */ }

  const dbPath = path.join(process.cwd(), DB_FILE);
  if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
  for (const ext of ["-wal", "-shm"]) {
    const p = dbPath + ext;
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }
  console.log("[flows] Cleanup complete");
}
