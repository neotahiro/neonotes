import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { test } from "node:test";

type Handler = (event: any) => void;
const ORIGIN = "https://app.test";

/** A tiny stand-in for the browser's cache storage. */
class FakeCache {
  entries = new Map<string, Response>();
  private key = (r: any) => (typeof r === "string" ? new URL(r, ORIGIN).href : r.url);
  async put(r: any, res: Response) { this.entries.set(this.key(r), res); }
  async match(r: any) { return this.entries.get(this.key(r))?.clone(); }
  async keys() { return [...this.entries.keys()].map((url) => ({ url })); }
  async delete(r: any) { return this.entries.delete(this.key(r)); }
}

function setup() {
  const listeners: Record<string, Handler> = {};
  const stores = new Map<string, FakeCache>();
  const net = { online: true, calls: 0, never: false, respond: (_url: string): any => new Response("fresh", { headers: { "Content-Type": "text/html" } }) };
  const sandbox: any = {
    self: { location: { origin: ORIGIN }, addEventListener: (n: string, h: Handler) => (listeners[n] = h), skipWaiting() {}, clients: { claim: async () => {} } },
    caches: {
      open: async (n: string) => { if (!stores.has(n)) stores.set(n, new FakeCache()); return stores.get(n)!; },
      keys: async () => [...stores.keys()],
      delete: async (n: string) => stores.delete(n),
    },
    fetch: (req: any) => {
      net.calls++;
      if (net.never) return new Promise(() => {});
      if (!net.online) return Promise.reject(new TypeError("offline"));
      return Promise.resolve(net.respond(typeof req === "string" ? req : req.url));
    },
    setTimeout: (fn: () => void) => setTimeout(fn, 5), // shortens the "slow network" wait for the tests
    Response, URL, Promise,
  };
  vm.runInNewContext(fs.readFileSync(path.join(process.cwd(), "public/sw.js"), "utf8"), sandbox);
  const request = (pathname: string, extra: object = {}) => ({ method: "GET", url: ORIGIN + pathname, mode: "cors", ...extra });
  const fire = (req: any) => {
    const event: any = { request: req, responded: undefined as Promise<Response> | undefined, respondWith(p: any) { this.responded = Promise.resolve(p); }, waitUntil() {} };
    listeners.fetch(event);
    return event.responded;
  };
  return { listeners, stores, net, request, fire };
}

test("API calls, other sites and non-GET requests are left alone", () => {
  const { fire, request } = setup();
  assert.equal(fire(request("/api/drive/files")), undefined);
  assert.equal(fire({ ...request("/"), method: "POST", mode: "navigate" }), undefined);
  assert.equal(fire({ method: "GET", url: "https://other.test/a.js", mode: "cors" }), undefined);
});

test("the main page opens from the saved copy when offline", async () => {
  const { fire, request, net } = setup();
  const online = await fire(request("/", { mode: "navigate" }))!;
  assert.equal(await online.text(), "fresh");
  await new Promise((r) => setTimeout(r, 10));
  net.online = false;
  const offline = await fire(request("/", { mode: "navigate" }))!;
  assert.equal(await offline.text(), "fresh");
});

test("a slow network falls back to the saved copy", async () => {
  const { fire, request, net } = setup();
  await fire(request("/", { mode: "navigate" }))!;
  await new Promise((r) => setTimeout(r, 10));
  net.never = true;
  const res = await fire(request("/", { mode: "navigate" }))!;
  assert.equal(await res.text(), "fresh");
});

test("redirects and errors are never saved as the main page", async () => {
  const { fire, request, net, stores } = setup();
  net.respond = () => ({ ok: false, type: "opaqueredirect", status: 0, redirected: false, headers: new Headers(), clone() { return this; } });
  await fire(request("/", { mode: "navigate" }))!;
  net.respond = () => new Response("nope", { status: 500, headers: { "Content-Type": "text/html" } });
  await fire(request("/", { mode: "navigate" }))!;
  assert.equal(stores.get("neonotes-pages-v1")?.entries.size ?? 0, 0);
});

test("with nothing saved and no connection, a friendly offline page shows", async () => {
  const { fire, request, net } = setup();
  net.online = false;
  const res = await fire(request("/", { mode: "navigate" }))!;
  assert.equal(res.status, 503);
  assert.match(await res.text(), /offline/i);
});

test("app files are saved once and then served without the network", async () => {
  const { fire, request, net } = setup();
  net.respond = () => new Response("console.log(1)", { headers: { "Content-Type": "application/javascript" } });
  await fire(request("/_next/static/chunks/app.js"))!;
  const callsAfterFirst = net.calls;
  net.online = false;
  const again = await fire(request("/_next/static/chunks/app.js"))!;
  assert.equal(await again.text(), "console.log(1)");
  assert.equal(net.calls, callsAfterFirst);
});

test("other pages such as the login page are never saved", async () => {
  const { fire, request, stores } = setup();
  await fire(request("/login", { mode: "navigate" }))!;
  assert.equal(stores.get("neonotes-pages-v1")?.entries.size ?? 0, 0);
});

test("old caches are removed when a new worker takes over", async () => {
  const { listeners, stores } = setup();
  stores.set("neonotes-pages-v0", new FakeCache());
  stores.set("neonotes-pages-v1", new FakeCache());
  let done: Promise<unknown> | undefined;
  listeners.activate({ waitUntil: (p: Promise<unknown>) => (done = p) });
  await done;
  assert.deepEqual([...stores.keys()], ["neonotes-pages-v1"]);
});
