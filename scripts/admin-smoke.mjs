#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { createTRPCProxyClient, httpBatchLink } from "@trpc/client";
import superjson from "superjson";

const DEFAULT_API_BASE_URL = "https://apifoodspark.techsparks-co-th.com";

function loadEnvFile(file) {
  if (!fs.existsSync(file)) return;
  const content = fs.readFileSync(file, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = trimmed.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (process.env[key] != null) continue;
    let value = rawValue.trim();
    const first = value[0];
    const last = value[value.length - 1];
    if (value.length >= 2 && first === last && (first === '"' || first === "'")) value = value.slice(1, -1);
    process.env[key] = value;
  }
}

loadEnvFile(path.join(process.cwd(), ".env"));
loadEnvFile(path.join(process.cwd(), ".env.local"));

function apiBaseUrl() {
  const raw = (process.env.ADMIN_SMOKE_API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || DEFAULT_API_BASE_URL).trim();
  try {
    return new URL(raw).origin.replace(/\/$/, "");
  } catch {
    return DEFAULT_API_BASE_URL;
  }
}

function requiredCredential(name, fallbackName) {
  return (process.env[name] || process.env[fallbackName] || "").trim();
}

const email = requiredCredential("ADMIN_SMOKE_EMAIL", "ADMIN_UAT_EMAIL");
const password = requiredCredential("ADMIN_SMOKE_PASSWORD", "ADMIN_UAT_PASSWORD");
const allowSkip = process.env.ADMIN_SMOKE_ALLOW_SKIP === "1";

if (!email || !password) {
  const message = "ADMIN_SMOKE_EMAIL/ADMIN_SMOKE_PASSWORD are required for admin smoke test";
  if (allowSkip) {
    console.log(`[SKIP] ${message}`);
    process.exit(0);
  }
  console.error(`[FAIL] ${message}`);
  process.exit(1);
}

let token = "";
const baseUrl = apiBaseUrl();
const client = createTRPCProxyClient({
  links: [
    httpBatchLink({
      url: `${baseUrl}/api/trpc`,
      transformer: superjson,
      headers() {
        return token ? { Authorization: `Bearer ${token}` } : {};
      },
    }),
  ],
});

const checks = [
  ["admin.overview", () => client.admin.overview.query()],
  ["admin.myAccess", () => client.admin.myAccess.query()],
  ["admin.listPendingApprovals", () => client.admin.listPendingApprovals.query()],
  ["admin.listOrders", () => client.admin.listOrders.query({ limit: 10 })],
  ["admin.listUsers", () => client.admin.listUsers.query()],
  ["admin.listRestaurants", () => client.admin.listRestaurants.query()],
  ["admin.listRiders", () => client.admin.listRiders.query()],
  ["admin.financeSettlement", () => client.admin.financeSettlement.query({ days: 7 })],
  ["payout.adminOverview", () => client.payout.adminOverview.query()],
  ["payout.adminList", () => client.payout.adminList.query({ status: "pending" })],
  ["payout.adminTopupList", () => client.payout.adminTopupList.query({ status: "pending" })],
  ["admin.listIncidents", () => client.admin.listIncidents.query({ status: "all" })],
  ["admin.listDisputes", () => client.admin.listDisputes.query({ status: "all" })],
  ["admin.listAuditLogs", () => client.admin.listAuditLogs.query({ limit: 20 })],
  ["admin.getSettings", () => client.admin.getSettings.query()],
];

async function main() {
  console.log(`[admin-smoke] API ${baseUrl}`);
  const login = await client.auth.login.mutate({ email, password });
  if (!login?.token || login?.user?.role !== "admin") {
    throw new Error("login did not return an admin token");
  }
  token = login.token;
  console.log(`[PASS] auth.login admin=${login.user.email ?? login.user.id}`);

  for (const [label, fn] of checks) {
    await fn();
    console.log(`[PASS] ${label}`);
  }
  console.log("Admin smoke test finished successfully.");
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[FAIL] ${message}`);
  process.exit(1);
});
