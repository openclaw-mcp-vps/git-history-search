import OpenAI from "openai";

export interface SearchContextItem {
  type: string;
  title: string;
  url: string;
  excerpt: string;
  score: number;
  createdAt: string;
}

let cachedClient: OpenAI | null = null;

export function hasOpenAIKey(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

function getClient(): OpenAI {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  if (!cachedClient) {
    cachedClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  return cachedClient;
}

export async function createEmbeddings(texts: string[]): Promise<number[][]> {
  if (!hasOpenAIKey()) {
    return [];
  }

  const cleanTexts = texts.map((item) => item.trim()).filter(Boolean);
  if (cleanTexts.length === 0) {
    return [];
  }

  const client = getClient();
  const response = await client.embeddings.create({
    model: process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small",
    input: cleanTexts
  });

  return response.data.map((item) => item.embedding);
}

function fallbackAnswer(query: string, matches: SearchContextItem[]): string {
  if (matches.length === 0) {
    return `I couldn't find an indexed commit, PR, or issue matching "${query}". Sync a repository first, then retry.`;
  }

  const bullets = matches
    .slice(0, 5)
    .map((match, index) => `${index + 1}. [${match.type.toUpperCase()}] ${match.title} (${match.url})`)
    .join("\n");

  return `Top history matches for "${query}":\n${bullets}`;
}

export async function answerWithContext(
  query: string,
  matches: SearchContextItem[]
): Promise<string> {
  if (!hasOpenAIKey()) {
    return fallbackAnswer(query, matches);
  }

  const client = getClient();
  const context = matches
    .map((match, index) => {
      return [
        `Result ${index + 1}`,
        `Type: ${match.type}`,
        `Title: ${match.title}`,
        `URL: ${match.url}`,
        `Created: ${match.createdAt}`,
        `Excerpt: ${match.excerpt}`
      ].join("\n");
    })
    .join("\n\n");

  const completion = await client.chat.completions.create({
    model: process.env.OPENAI_CHAT_MODEL || "gpt-4o-mini",
    temperature: 0.2,
    messages: [
      {
        role: "system",
        content:
          "You answer developer git-history questions. Use only the provided context. Highlight concrete commit/PR/issue evidence with why each item is relevant."
      },
      {
        role: "user",
        content: `Question: ${query}\n\nContext:\n${context}`
      }
    ]
  });

  return (
    completion.choices[0]?.message?.content?.trim() ||
    fallbackAnswer(query, matches)
  );
}
