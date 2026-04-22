import { promises as fs } from "node:fs";
import path from "node:path";

export interface PaidEntitlement {
  email: string;
  source: string;
  grantedAt: string;
  eventId?: string;
}

export interface RepoSyncRecord {
  repoFullName: string;
  syncedAt: string;
  commits: number;
  pullRequests: number;
  issues: number;
  documents: number;
  defaultBranch: string;
}

const dataDirectory = path.join(process.cwd(), ".data");
const entitlementsFile = path.join(dataDirectory, "entitlements.json");
const repoSyncFile = path.join(dataDirectory, "repo-sync.json");

let writeQueue: Promise<void> = Promise.resolve();

async function ensureDataDirectory() {
  await fs.mkdir(dataDirectory, { recursive: true });
}

function queueWrite<T>(task: () => Promise<T>): Promise<T> {
  const pending = writeQueue.then(task, task);
  writeQueue = pending.then(
    () => undefined,
    () => undefined,
  );
  return pending;
}

async function readJsonFile<T>(filePath: string, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw) as T;
  } catch (error) {
    const isMissing =
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as NodeJS.ErrnoException).code === "ENOENT";
    if (isMissing) {
      return fallback;
    }
    throw error;
  }
}

async function writeJsonFile<T>(filePath: string, data: T): Promise<void> {
  await ensureDataDirectory();
  const tempPath = `${filePath}.tmp`;
  await fs.writeFile(tempPath, JSON.stringify(data, null, 2), "utf8");
  await fs.rename(tempPath, filePath);
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function listEntitlements(): Promise<Record<string, PaidEntitlement>> {
  return readJsonFile<Record<string, PaidEntitlement>>(entitlementsFile, {});
}

export async function getEntitlementByEmail(
  email: string,
): Promise<PaidEntitlement | null> {
  const normalized = normalizeEmail(email);
  const all = await listEntitlements();
  return all[normalized] ?? null;
}

export async function upsertEntitlement(entry: PaidEntitlement): Promise<void> {
  const normalized = normalizeEmail(entry.email);
  await queueWrite(async () => {
    const all = await listEntitlements();
    all[normalized] = {
      ...entry,
      email: normalized,
    };
    await writeJsonFile(entitlementsFile, all);
  });
}

export async function listRepoSyncRecords(): Promise<Record<string, RepoSyncRecord>> {
  return readJsonFile<Record<string, RepoSyncRecord>>(repoSyncFile, {});
}

export async function getRepoSyncRecord(
  repoFullName: string,
): Promise<RepoSyncRecord | null> {
  const all = await listRepoSyncRecords();
  return all[repoFullName] ?? null;
}

export async function upsertRepoSyncRecord(record: RepoSyncRecord): Promise<void> {
  await queueWrite(async () => {
    const all = await listRepoSyncRecords();
    all[record.repoFullName] = record;
    await writeJsonFile(repoSyncFile, all);
  });
}

export function getDataFilePath(fileName: string): string {
  return path.join(dataDirectory, fileName);
}
