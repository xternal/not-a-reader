/**
 * not-a-reader: tell a person opening a page from a crawler, a link preview, an AI fetcher, a script or a
 * browser fetching ahead, using only the request's user agent and fetch headers. Nothing is stored: the
 * checks answer yes or no, and the user agent is never kept.
 */

/**
 * Words that appear in the user agent of something that is not a person reading. Browsers never put a web
 * address in their name, so `https?://` catches the many crawlers that do. Written as a plain string so it
 * can be used outside JavaScript too (a Postgres `~*` check, for example).
 */
export const NOT_A_READER_PATTERN: string = [
  // search engines and general crawlers
  "bot", "crawl", "spider", "slurp",
  // link previews in chat apps and social sites
  "preview", "facebookexternalhit", "facebookcatalog", "meta-external", "embedly",
  "whatsapp", "telegram", "skype", "discord", "slack",
  // scripts and HTTP libraries
  "curl", "wget", "python", "httpx", "go-http", "java/", "okhttp", "axios", "node-fetch",
  "undici", "^node", "deno", "ruby", "php", "libwww", "postman", "insomnia",
  // test, speed and uptime tools
  "headless", "lighthouse", "pagespeed", "inspectiontool", "pingdom", "uptime", "monitor",
  // feed readers, scanners and archives
  "feed", "rss", "scan", "archive",
  // AI fetchers
  "chatgpt", "claude", "perplexity", "anthropic", "openai",
  // a web address in the name
  "https?://",
].join("|");

const escape = (word: string): string => word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * The pattern as a case-insensitive RegExp. `also` adds words of your own, matched literally: usually the
 * site's own name, so its own scripts and health checks are not counted (`["ukraineledger", "vercel"]`).
 */
export function notAReader(also: readonly string[] = []): RegExp {
  const extra = also.filter((w) => w.length > 0).map(escape);
  return new RegExp([NOT_A_READER_PATTERN, ...extra].join("|"), "i");
}

const DEFAULT = notAReader();

export interface ReaderOptions {
  /** Extra words, matched literally (see `notAReader`). */
  also?: readonly string[];
}

/**
 * True for a crawler, a link preview, an AI fetcher or a script. A missing or empty user agent is not a
 * reader either: every browser sends one.
 */
export function isNotAReader(userAgent: string | null | undefined, options: ReaderOptions = {}): boolean {
  if (!userAgent) return true;
  const pattern = options.also?.length ? notAReader(options.also) : DEFAULT;
  return pattern.test(userAgent);
}

/** Anything with `get` and `has`, like the Fetch API's Headers. */
export interface HeaderLike {
  get(name: string): string | null;
  has(name: string): boolean;
}

export interface ReadOptions {
  /**
   * Next.js links that move within the app send a request with `RSC: 1` for the page they open. Set this to
   * count those as reads; by default any request with an `RSC` header is a part of a page, not a read.
   * Next.js prefetches are never reads either way.
   */
  countClientNavigation?: boolean;
}

/**
 * True when the request is not a page being opened: a browser fetching or prerendering ahead of a click, or a
 * request for a part of a page (an image, a script, a frame). Browsers that send no `Sec-Fetch-Dest` still
 * count as reads.
 */
export function isNotARead(headers: HeaderLike, options: ReadOptions = {}): boolean {
  const purpose = headers.get("sec-purpose") ?? headers.get("purpose") ?? "";
  if (/prefetch|prerender/i.test(purpose)) return true;
  if (headers.has("next-router-prefetch") || headers.has("next-router-segment-prefetch")) return true;
  if (headers.has("rsc")) return !(options.countClientNavigation === true && headers.get("rsc") === "1");
  const dest = headers.get("sec-fetch-dest");
  return dest !== null && dest !== "document";
}

/** True when a request is a person opening a page: a reader's browser, not a fetch ahead or a part. */
export function isAReading(headers: HeaderLike, options: ReaderOptions & ReadOptions = {}): boolean {
  return !isNotAReader(headers.get("user-agent"), options) && !isNotARead(headers, options);
}
