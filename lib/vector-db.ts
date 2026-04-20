import { createEmbeddings, hasOpenAIKey } from "@/lib/openai";
import { readStore, writeStore } from "@/lib/storage";
import type { HistoryDocument } from "@/lib/github";

export interface SearchHit {
  id: string;
  type: string;
  title: string;
  url: string;
  excerpt: string;
  score: number;
  createdAt: string;
}

interface VectorRecord {
  id: string;
  text: string;
  embedding: number[] | null;
  metadata: {
    type: string;
    title: string;
    url: string;
    createdAt: string;
  };
}

type VectorStore = Record<string, VectorRecord[]>;
const VECTOR_FILE = "vectors.json";

function repoKey(value: string): string {
  return value.toLowerCase();
}

function normalizeText(doc: HistoryDocument): string {
  return doc.text.replace(/\s+/g, " ").trim().slice(0, 5000);
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let magA = 0;
  let magB = 0;

  const length = Math.min(a.length, b.length);
  for (let i = 0; i < length; i += 1) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }

  if (magA === 0 || magB === 0) {
    return 0;
  }

  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

function keywordScore(query: string, text: string): number {
  const terms = query
    .toLowerCase()
    .split(/\s+/)
    .map((term) => term.trim())
    .filter((term) => term.length > 1);

  if (terms.length === 0) {
    return 0;
  }

  const lower = text.toLowerCase();
  let score = 0;
  for (const term of terms) {
    if (lower.includes(term)) {
      score += 1;
    }
  }

  return score / terms.length;
}

export async function indexRepositoryDocuments(
  repository: string,
  docs: HistoryDocument[]
): Promise<{ indexedCount: number }> {
  const prepared = docs.map((doc) => ({
    id: doc.id,
    text: normalizeText(doc),
    metadata: {
      type: doc.type,
      title: doc.title,
      url: doc.url,
      createdAt: doc.createdAt
    }
  }));

  let embeddings: number[][] = [];
  if (hasOpenAIKey()) {
    embeddings = await createEmbeddings(prepared.map((doc) => doc.text));
  }

  const records: VectorRecord[] = prepared.map((doc, index) => ({
    id: doc.id,
    text: doc.text,
    embedding: embeddings[index] ?? null,
    metadata: doc.metadata
  }));

  const store = await readStore<VectorStore>(VECTOR_FILE, {});
  store[repoKey(repository)] = records;
  await writeStore(VECTOR_FILE, store);

  return { indexedCount: records.length };
}

export async function searchRepository(
  repository: string,
  query: string,
  limit = 8
): Promise<SearchHit[]> {
  const store = await readStore<VectorStore>(VECTOR_FILE, {});
  const records = store[repoKey(repository)] ?? [];

  if (records.length === 0) {
    return [];
  }

  let queryEmbedding: number[] | null = null;
  if (hasOpenAIKey()) {
    const result = await createEmbeddings([query]);
    queryEmbedding = result[0] ?? null;
  }

  const ranked = records
    .map((record) => {
      const score =
        queryEmbedding && record.embedding
          ? cosineSimilarity(queryEmbedding, record.embedding)
          : keywordScore(query, record.text);

      return {
        ...record,
        score
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return ranked.map((record) => ({
    id: record.id,
    type: record.metadata.type,
    title: record.metadata.title,
    url: record.metadata.url,
    score: Number(record.score.toFixed(4)),
    createdAt: record.metadata.createdAt,
    excerpt: record.text.slice(0, 400)
  }));
}
