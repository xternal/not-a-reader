# not-a-reader

Count people, not crawlers. `not-a-reader` tells a person opening a page apart from a search-engine crawler, a chat app's link preview, an AI fetcher, a script, an uptime check or a browser fetching ahead of a click. It looks only at the request's user agent and fetch headers, answers yes or no, and stores nothing.

It is the check behind the privacy-first page counters on [LedgerGov.UK](https://ledgergov.uk), [BoroughBook.UK](https://boroughbook.uk), [UkraineLedger.com](https://ukraineledger.com), [USLedger.org](https://usledger.org), [RussiaLedger.com](https://russialedger.com) and [offyougo.uk](https://offyougo.uk): one number per page per day, and nothing about the reader.

- Zero dependencies, about 3 KB, ESM with TypeScript types.
- Works anywhere the Fetch API's `Headers` exists: Vercel and Next.js middleware, Cloudflare Workers, Deno, Bun, Node 18+, the browser.
- The list is also a plain string, so a database can run the same check (Postgres example below).

## Install

```bash
npm install not-a-reader
```

## Use

In middleware or a worker, count a page only when a person opens it:

```ts
import { isAReading } from "not-a-reader";

export default function middleware(request: Request) {
  if (request.method === "GET" && isAReading(request.headers, { also: ["mysite"] })) {
    // add one to today's count for this path
  }
}
```

The parts, if you need them separately:

```ts
import { isNotAReader, isNotARead } from "not-a-reader";

isNotAReader(request.headers.get("user-agent")); // crawler, preview, AI fetcher, script, or no user agent
isNotARead(request.headers);                     // prefetch, prerender, or a part of a page (image, script, frame)
```

In the browser, before sending a page view:

```ts
import { isNotAReader } from "not-a-reader";
if (!isNotAReader(navigator.userAgent)) sendView();
```

### Options

- `also: string[]`: extra words, matched literally and ignoring case. Usually your site's own name and your host's, so your own scripts and health checks don't count (`{ also: ["mysite", "vercel"] }`).
- `countClientNavigation: true`: count Next.js in-app navigation (`RSC: 1` requests) as reads. By default any request with an `RSC` header is a part of a page. Next.js prefetches never count.

### The same check in Postgres

`NOT_A_READER_PATTERN` is a plain string that also works with Postgres's case-insensitive `~*`:

```sql
-- in a trigger on rows coming through PostgREST / Supabase
if current_setting('request.headers', true)::json ->> 'user-agent' ~* '<NOT_A_READER_PATTERN>' then
  return null; -- not kept
end if;
```

Keep a test that compares your SQL with the package's pattern, so the two can't drift apart.

## What it catches

| Kind | Examples |
| --- | --- |
| Search engines and crawlers | Googlebot, Bingbot, Yahoo Slurp, anything with "bot", "crawl" or "spider" |
| Link previews | Facebook, Meta, WhatsApp, Telegram, Slack, Discord, Skype, Embedly |
| AI fetchers | ChatGPT, OpenAI, Claude, Anthropic, Perplexity |
| Scripts and libraries | curl, wget, Python, httpx, Go, Java, OkHttp, axios, node-fetch, undici, Node, Deno, Ruby, PHP, Postman |
| Tests and monitors | headless browsers, Lighthouse, PageSpeed, Google Inspection Tool, Pingdom, uptime checks |
| Feeds, scanners, archives | feed readers, RSS, security scanners, the Internet Archive |
| Anything else naming a web address | browsers never put `http://` or `https://` in their name |
| Not a page being opened | `Sec-Purpose: prefetch` or `prerender`, Next.js prefetches, `Sec-Fetch-Dest` other than `document` |

A request with no user agent is not counted: every browser sends one.

## What it can't catch

A crawler that copies an ordinary browser's user agent and headers looks exactly like a person, and no list of names can tell them apart. For a counter that only needs to be roughly right, that is usually a small share. Compare with an analytics tool that uses other signals if you need more.

## FAQ

**Does it store or send anything?** No. It reads two or three headers and returns `true` or `false`.

**Why not a big user-agent database?** Those are large and need constant updates. A short list of words catches nearly every honest crawler, because honest crawlers name themselves.

**Can I add a crawler that slips through?** Yes: pass it in `also` today, and open an issue or a pull request so everyone gets it.

## Licence

MIT © [Pavel Guzhikov](https://guzh.uk)
