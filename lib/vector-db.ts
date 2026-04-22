import { promises as fs } from "node:fs";

import { getDataFilePath } from "@/lib/db";

export type SearchSourceType = "commit" | "pull_request" | "issue";

export interface IndexedDocument {
  id: string;
  repoFullName: string;
  sourceType: SearchSourceType;
  sourceId: string;
  title: string;
  body: string;
  url: string;
  authoredAt: string;
  embedding: number[];
}

export interface SearchHit extends IndexedDocument {
  score: number;
  keywordMatches: number;
  excerpt: string;
}

const vectorsFile = getDataFilePath("vectors.json");

let writeQueue: Promise<void> = Promise.resolve();

function queueWrite<T>(task: () => Promise<T>): Promise<T> {
  const pending = writeQueue.then(task, task);
  writeQueue = pending.then(
    () => undefined,
    () => undefined,
  );
  return pending;
}

async function readVectors(): Promise<IndexedDocument[]> {
  try {
    const raw = await fs.readFile(vectorsFile, "utf8");
    return JSON.parse(raw) as IndexedDocument[];
  } catch (error) {
    const isMissing =
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as NodeJS.ErrnoException).code === "ENOENT";
    if (isMissing) {
      return [];
    }
    throw error;
  }
}

async function writeVectors(allDocuments: IndexedDocument[]): Promise<void> {
  await fs.mkdir(getDataFilePath("."), { recursive: true });
  const tempPath = `${vectorsFile}.tmp`;
  await fs.writeFile(tempPath, JSON.stringify(allDocuments, null, 2), "utf8");
  await fs.rename(tempPath, vectorsFile);
}

function cosineSimilarity(vectorA: number[], vectorB: number[]): number {
  if (vectorA.length === 0 || vectorB.length === 0 || vectorA.length !== vectorB.length) {
    return 0;
  }

  let dot = 0;
  let magA = 0;
  let magB = 0;

  for (let i = 0; i < vectorA.length; i += 1) {
    dot += vectorA[i] * vectorB[i];
    magA += vectorA[i] * vectorA[i];
    magB += vectorB[i] * vectorB[i];
  }

  if (magA === 0 || magB === 0) {
    return 0;
  }

  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

function keywordBoost(query: string, body: string, title: string): number {
  const terms = query
    .toLowerCase()
    .split(/\s+/)
    .map((term) => term.trim())
    .filter((term) => term.length > 2);

  if (terms.length === 0) {
    return 0;
  }

  const haystack = `${title}\n${body}`.toLowerCase();
  let hits = 0;
  for (const term of terms) {
    if (haystack.includes(term)) {
      hits += 1;
    }
  }
  return hits / terms.length;
}

function buildExcerpt(query: string, body: string): string {
  const compact = body.replace(/\s+/g, " ").trim();
  if (compact.length <= 260) {
    return compact;
  }

  const queryTerms = query
    .toLowerCase()
    .split(/\s+/)
    .map((term) => term.trim())
    .filter((term) => term.length > 2);

  const lower = compact.toLowerCase();
  let index = -1;
  for (const term of queryTerms) {
    const termIndex = lower.indexOf(term);
    if (termIndex >= 0) {
      index = termIndex;
      break;
    }
  }

  if (index < 0) {
    return `${compact.slice(0, 257)}...`;
  }

  const start = Math.max(0, index - 70);
  const end = Math.min(compact.length, index + 190);
  const snippet = compact.slice(start, end);

  if (start === 0 && end === compact.length) {
    return snippet;
  }

  if (start === 0) {
    return `${snippet}...`;
  }

  if (end === compact.length) {
    return `...${snippet}`;
  }

  return `...${snippet}...`;
}

export async function replaceRepositoryDocuments(
  repoFullName: string,
  documents: IndexedDocument[],
): Promise<void> {
  await queueWrite(async () => {
    const allDocuments = await readVectors();
    const untouched = allDocuments.filter((entry) => entry.repoFullName !== repoFullName);
    await writeVectors([...untouched, ...documents]);
  });
}

export async function getRepositoryDocumentCount(repoFullName: string): Promise<number> {
  const allDocuments = await readVectors();
  return allDocuments.filter((entry) => entry.repoFullName === repoFullName).length;
}

export async function searchRepositoryDocuments(
  repoFullName: string,
  query: string,
  queryEmbedding: number[],
  limit = 8,
): Promise<SearchHit[]> {
  const allDocuments = await readVectors();
  const repoDocuments = allDocuments.filter((entry) => entry.repoFullName === repoFullName);

  const scored = repoDocuments.map((entry) => {
    const semantic = cosineSimilarity(queryEmbedding, entry.embedding);
    const lexical = keywordBoost(query, entry.body, entry.title);
    const finalScore = semantic * 0.82 + lexical * 0.18;
    return {
      ...entry,
      score: Number(finalScore.toFixed(6)),
      keywordMatches: Number((lexical * 100).toFixed(0)),
      excerpt: buildExcerpt(query, entry.body),
    };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(1, limit));
}
