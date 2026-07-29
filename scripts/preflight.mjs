import { execFileSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";

const failures = [];

function check(condition, message) {
  if (!condition) failures.push(message);
}

function read(path) {
  check(existsSync(path), `Missing required file: ${path}`);
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

const packageJson = JSON.parse(read("package.json") || "{}");
const lockfile = read("pnpm-lock.yaml");
const app = read("src/app.ts");
const paymentService = read("src/modules/payments/payment.service.ts");
const openapi = read("src/doc/openapi.yaml");
const schema = read("prisma/schema.prisma");
const seed = read("prisma/seed.ts");
const vercel = read("vercel.json");
const prismaConfig = read("prisma.config.ts");
const envExample = read(".env.example");

check(packageJson.packageManager === "pnpm@10.17.1", "packageManager must pin pnpm@10.17.1");
check(packageJson.engines?.node === "22.x", "Node.js engine must be 22.x");
check(packageJson.scripts?.postinstall === "prisma generate", "postinstall must generate Prisma Client");
check(packageJson.scripts?.preflight, "Missing preflight script");
check((lockfile.match(/^---$/gm) ?? []).length === 0, "pnpm-lock.yaml contains multiple YAML documents");
check(lockfile.includes("express:"), "pnpm-lock.yaml does not contain application dependencies");
check(app.includes('/api/payments/webhook'), "Stripe webhook is not mounted before JSON parsing");
check(paymentService.includes("webhooks.constructEvent"), "Stripe webhook signature verification is missing");
check(paymentService.includes("checkout.sessions.retrieve"), "Stripe server-side Checkout verification is missing");
check(!paymentService.includes("cs_sim_"), "Simulated Stripe session code is still present");
check(!paymentService.includes("falling back to simulated"), "Payment code still contains a simulation fallback");
check(openapi.includes("/api/payments/webhook:"), "OpenAPI is missing Stripe webhook documentation");
check(openapi.includes("/api/landlord/requests/{id}/complete:"), "OpenAPI is missing rental completion documentation");
check(openapi.includes("name: amenities"), "OpenAPI is missing amenities filtering");
check(schema.includes("model Payment"), "Prisma Payment model is missing");
check(schema.includes("model Review"), "Prisma Review model is missing");
check(seed.includes("Role.ADMIN"), "Admin seed logic is missing");
check(vercel.includes('"api/index.ts"'), "Vercel function entry is missing");
check(prismaConfig.includes('env("DIRECT_URL")'), "Prisma migrations must use DIRECT_URL");
check(envExample.includes("DIRECT_URL="), ".env.example is missing DIRECT_URL");

try {
  const commitCount = Number(
    execFileSync("git", ["rev-list", "--count", "HEAD"], { encoding: "utf8" }).trim()
  );
  check(commitCount >= 20, `Only ${commitCount} commits found; at least 20 are required`);
} catch {
  failures.push("Unable to verify Git commit count");
}

if (failures.length) {
  console.error("Preflight failed:\n");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("RentNest preflight passed.");
