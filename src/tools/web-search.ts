import { createTool } from "@anvia/core";
import { z } from "zod";

// Wikipedia's public API needs no key and is reachable from networks that block
// DuckDuckGo, so it works as a simple, free web search backend for this exercise.
const USER_AGENT = "pustaka-research-agent/1.0 (Devscale agent-sandbox exercise)";
const MAX_EXTRACT_CHARS = 600;

export type SearchResult = {
  title: string;
  url: string;
  snippet: string;
};

type WikiPage = {
  index?: number;
  title: string;
  fullurl?: string;
  extract?: string;
};

export async function searchWeb(query: string, language = "en", limit = 5): Promise<SearchResult[]> {
  const endpoint = new URL(`https://${language}.wikipedia.org/w/api.php`);
  endpoint.search = new URLSearchParams({
    action: "query",
    format: "json",
    formatversion: "2",
    generator: "search",
    gsrsearch: query,
    gsrlimit: String(limit),
    prop: "extracts|info",
    exintro: "1",
    explaintext: "1",
    exlimit: "max",
    inprop: "url",
  }).toString();

  const response = await fetch(endpoint, {
    headers: { "User-Agent": USER_AGENT },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) {
    throw new Error(`Search request failed with HTTP ${response.status}`);
  }

  const body = (await response.json()) as { query?: { pages?: WikiPage[] } };
  const pages = body.query?.pages ?? [];

  return pages
    .sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
    .map((page) => ({
      title: page.title,
      url: page.fullurl ?? `https://${language}.wikipedia.org/wiki/${encodeURIComponent(page.title.replaceAll(" ", "_"))}`,
      snippet: (page.extract ?? "").replace(/\s+/g, " ").trim().slice(0, MAX_EXTRACT_CHARS),
    }));
}

export const webSearchTool = createTool({
  name: "web_search",
  description:
    "Search the web (Wikipedia) for a topic. Returns up to 5 results with title, url and a short snippet. " +
    "Use short keyword queries, not full sentences. An empty `results` array means nothing was found.",
  inputSchema: z.object({
    query: z.string().min(2).describe("Short keyword query, e.g. 'Python programming language history'."),
    language: z
      .enum(["en", "id"])
      .optional()
      .describe("Wikipedia language edition. Use 'id' for Indonesian-specific topics. Defaults to 'en'."),
  }),
  execute: async ({ query, language }) => {
    const results = await searchWeb(query, language ?? "en");
    return { query, resultCount: results.length, results };
  },
});
