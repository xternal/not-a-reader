import { strict as assert } from "node:assert";
import { test } from "node:test";
import { isAReading, isNotARead, isNotAReader, NOT_A_READER_PATTERN, notAReader } from "../src/index.ts";

const readers = {
  chrome: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
  safariIphone: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1",
  firefox: "Mozilla/5.0 (X11; Linux x86_64; rv:132.0) Gecko/20100101 Firefox/132.0",
  edge: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0",
  samsung: "Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/26.0 Chrome/122.0.0.0 Mobile Safari/537.36",
};

const notReaders = {
  googlebot: "Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X) AppleWebKit/537.36 Chrome/130.0.0.0 Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
  bing: "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm) Chrome/116.0.1938.76 Safari/537.36",
  yahoo: "Mozilla/5.0 (compatible; Yahoo! Slurp; http://help.yahoo.com/help/us/ysearch/slurp)",
  facebook: "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
  metaExternal: "meta-externalagent/1.1 (+https://developers.facebook.com/docs/sharing/webmasters/crawler)",
  whatsapp: "WhatsApp/2.23.20.0",
  slack: "Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)",
  discord: "Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)",
  telegram: "TelegramBot (like TwitterBot)",
  curl: "curl/8.10.1",
  python: "python-requests/2.32.3",
  undici: "undici",
  node: "node",
  go: "Go-http-client/2.0",
  headless: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/130.0.0.0 Safari/537.36",
  lighthouse: "Mozilla/5.0 (Linux; Android 11; moto g power (2022)) AppleWebKit/537.36 Chrome/130.0.0.0 Mobile Safari/537.36 Chrome-Lighthouse",
  inspection: "Mozilla/5.0 (compatible; Google-InspectionTool/1.0;)",
  chatgpt: "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; ChatGPT-User/1.0; +https://openai.com/bot",
  claude: "Claude-User (claude-code/2.0; +https://support.anthropic.com/)",
  perplexity: "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; Perplexity-User/1.0; +https://perplexity.ai/perplexity-user)",
  uptime: "Mozilla/5.0+(compatible; UptimeRobot/2.0; http://www.uptimerobot.com/)",
  feed: "Feedly/1.0 (+http://www.feedly.com/fetcher.html; 1 subscribers)",
  archive: "Mozilla/5.0 (compatible; archive.org_bot +http://www.archive.org/details/archive.org_bot)",
  anyAddress: "SomeFetcher/1.0 (+https://example.com/about)",
};

test("readers' browsers are readers", () => {
  for (const [name, ua] of Object.entries(readers)) assert.equal(isNotAReader(ua), false, name);
});

test("crawlers, previews, scripts and AI fetchers are not", () => {
  for (const [name, ua] of Object.entries(notReaders)) assert.equal(isNotAReader(ua), true, name);
});

test("no user agent is not a reader", () => {
  assert.equal(isNotAReader(null), true);
  assert.equal(isNotAReader(undefined), true);
  assert.equal(isNotAReader(""), true);
});

test("a site adds its own name, matched literally", () => {
  assert.equal(isNotAReader("ukraineledger-check/1", { also: ["ukraineledger"] }), true);
  assert.equal(isNotAReader(readers.chrome, { also: ["a.b"] }), false);
  assert.equal(isNotAReader("x a.b y", { also: ["a.b"] }), true);
  assert.equal(isNotAReader("x aXb y", { also: ["a.b"] }), false);
  assert.equal(notAReader([""]).source, notAReader().source);
});

test("the pattern works as a Postgres-style plain string", () => {
  assert.equal(new RegExp(NOT_A_READER_PATTERN, "i").test(notReaders.googlebot), true);
  assert.equal(NOT_A_READER_PATTERN.includes("\\"), false);
});

const h = (init: Record<string, string>) => new Headers(init);

test("a whole page being opened is a read", () => {
  assert.equal(isNotARead(h({ "sec-fetch-dest": "document" })), false);
  assert.equal(isNotARead(h({})), false); // browsers without Sec-Fetch-Dest
});

test("fetching ahead and parts of a page are not reads", () => {
  assert.equal(isNotARead(h({ "sec-purpose": "prefetch" })), true);
  assert.equal(isNotARead(h({ "sec-purpose": "prefetch;prerender" })), true);
  assert.equal(isNotARead(h({ purpose: "prefetch" })), true);
  assert.equal(isNotARead(h({ "next-router-prefetch": "1" })), true);
  assert.equal(isNotARead(h({ "next-router-segment-prefetch": "/_tree" })), true);
  assert.equal(isNotARead(h({ "sec-fetch-dest": "image" })), true);
  assert.equal(isNotARead(h({ "sec-fetch-dest": "empty" })), true);
});

test("Next.js client navigation counts only when asked", () => {
  assert.equal(isNotARead(h({ rsc: "1" })), true);
  assert.equal(isNotARead(h({ rsc: "1" }), { countClientNavigation: true }), false);
  assert.equal(isNotARead(h({ rsc: "1", "next-router-prefetch": "1" }), { countClientNavigation: true }), true);
});

test("isAReading puts both together", () => {
  assert.equal(isAReading(h({ "user-agent": readers.chrome, "sec-fetch-dest": "document" })), true);
  assert.equal(isAReading(h({ "user-agent": notReaders.googlebot, "sec-fetch-dest": "document" })), false);
  assert.equal(isAReading(h({ "user-agent": readers.chrome, "sec-purpose": "prefetch" })), false);
  assert.equal(isAReading(h({ "sec-fetch-dest": "document" })), false);
  assert.equal(isAReading(h({ "user-agent": "mysite-health/1" }), { also: ["mysite"] }), false);
});
