export interface WebSearchResult {
  title: string;
  url: string;
  content?: string;
  engine?: string;
}

export interface WebSearchOptions {
  baseUrl: string;
  query: string;
  page?: number;
  categories?: string;
  engines?: string;
  signal?: AbortSignal;
}

interface SearxngResponse {
  results?: Array<{
    title?: string;
    url?: string;
    content?: string;
    engine?: string;
  }>;
}

export async function searchWithSearxng(options: WebSearchOptions): Promise<WebSearchResult[]> {
  const baseUrl = options.baseUrl.trim().replace(/\/$/, "");
  if (!baseUrl) throw new Error("Search provider URL is required");
  if (!options.query.trim()) return [];

  const url = new URL(`${baseUrl}/search`);
  url.searchParams.set("q", options.query.trim());
  url.searchParams.set("format", "json");
  url.searchParams.set("pageno", String(options.page ?? 1));
  if (options.categories) url.searchParams.set("categories", options.categories);
  if (options.engines) url.searchParams.set("engines", options.engines);

  const response = await fetch(url, { signal: options.signal });
  if (!response.ok) {
    throw new Error(`Search failed: ${response.status}`);
  }

  const payload = await response.json() as SearxngResponse;
  return (payload.results ?? [])
    .filter((item) => item.title && item.url)
    .slice(0, 8)
    .map((item) => ({
      title: item.title!,
      url: item.url!,
      content: item.content,
      engine: item.engine
    }));
}
