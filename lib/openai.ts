import OpenAI from "openai";

const EMBEDDING_MODEL = process.env.OPENAI_EMBEDDING_MODEL ?? "text-embedding-3-small";
const SEARCH_SUMMARY_MODEL = process.env.OPENAI_SEARCH_MODEL ?? "gpt-4.1-mini";
const FALLBACK_DIMENSION = 192;

export interface SearchResultForSummary {
  title: string;
  sourceType: string;
  url: string;
  excerpt: string;
}

let client: OpenAI | null = null;

function getOpenAIClient(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY) {
    return null;
  }
  if (!client) {
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return client;
}

function normalizeVector(values: number[]): number[] {
  const magnitude = Math.sqrt(values.reduce((acc, value) => acc + value * value, 0));
  if (magnitude === 0) {
    return values;
  }
  return values.map((value) => value / magnitude);
}

function hashToken(token: string): number {
  let hash = 0;
  for (let i = 0; i < token.length; i += 1) {
    hash = (hash << 5) - hash + token.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function fallbackEmbedding(text: string): number[] {
  const vector = new Array<number>(FALLBACK_DIMENSION).fill(0);
  const tokens = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 1);

  for (const token of tokens) {
    const index = hashToken(token) % FALLBACK_DIMENSION;
    const sign = hashToken(`${token}-sign`) % 2 === 0 ? 1 : -1;
    vector[index] += sign;
  }

  return normalizeVector(vector);
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) {
    return [];
  }

  const openai = getOpenAIClient();
  if (!openai) {
    return texts.map((text) => fallbackEmbedding(text));
  }

  try {
    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: texts,
    });
    return response.data.map((entry) => entry.embedding);
  } catch {
    return texts.map((text) => fallbackEmbedding(text));
  }
}

export async function embedQuery(query: string): Promise<number[]> {
  const [embedding] = await embedTexts([query]);
  return embedding;
}

function buildFallbackSummary(
  query: string,
  results: SearchResultForSummary[],
): string {
  if (results.length === 0) {
    return `No indexed history matched "${query}" yet. Sync the repository first.`;
  }

  const topSources = results
    .slice(0, 3)
    .map((result) => `${result.sourceType}: ${result.title}`)
    .join(" | ");

  return `Top matches for "${query}" came from ${topSources}. Open the linked commits, PRs, or issues for exact context.`;
}

export async function summarizeSearchResults(
  query: string,
  results: SearchResultForSummary[],
): Promise<string> {
  if (results.length === 0) {
    return `I could not find relevant indexed commits, PRs, or issues for "${query}".`;
  }

  const openai = getOpenAIClient();
  if (!openai) {
    return buildFallbackSummary(query, results);
  }

  try {
    const compactContext = results.slice(0, 8).map((result) => ({
      sourceType: result.sourceType,
      title: result.title,
      excerpt: result.excerpt,
      url: result.url,
    }));

    const response = await openai.responses.create({
      model: SEARCH_SUMMARY_MODEL,
      max_output_tokens: 280,
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text: "You summarize git history search results for engineers. Be concise, concrete, and mention what changed and where to click.",
            },
          ],
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: `Query: ${query}\n\nSearch results:\n${JSON.stringify(compactContext, null, 2)}`,
            },
          ],
        },
      ],
    });

    const text = response.output_text?.trim();
    if (!text) {
      return buildFallbackSummary(query, results);
    }

    return text;
  } catch {
    return buildFallbackSummary(query, results);
  }
}
