import { readStore, writeStore } from "@/lib/storage";

export interface RepoIndexRecord {
  fullName: string;
  indexedCount: number;
  syncedAt: string;
}

type RepoStore = Record<string, RepoIndexRecord[]>;

const REPOS_FILE = "repositories.json";

function keyForUser(login: string): string {
  return login.toLowerCase();
}

export async function listIndexedReposForUser(login: string): Promise<RepoIndexRecord[]> {
  const store = await readStore<RepoStore>(REPOS_FILE, {});
  return store[keyForUser(login)] ?? [];
}

export async function upsertIndexedRepoForUser(login: string, record: RepoIndexRecord): Promise<void> {
  const store = await readStore<RepoStore>(REPOS_FILE, {});
  const key = keyForUser(login);
  const current = store[key] ?? [];
  const withoutExisting = current.filter((item) => item.fullName !== record.fullName);
  store[key] = [record, ...withoutExisting].sort((a, b) => {
    return new Date(b.syncedAt).getTime() - new Date(a.syncedAt).getTime();
  });
  await writeStore(REPOS_FILE, store);
}
