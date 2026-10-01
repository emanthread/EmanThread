const assert = require("node:assert/strict");
const { existsSync, readFileSync } = require("node:fs");
const { resolve } = require("node:path");
const { runInNewContext } = require("node:vm");
const test = require("node:test");

test("retired worker clears old page caches and refreshes storefront tabs", async () => {
  const workerPath = resolve(__dirname, "../public/sw.js");
  assert.ok(existsSync(workerPath), "the retired worker must be served at /sw.js");

  const listeners = new Map();
  const deleted = [];
  const navigated = [];
  let unregistered = false;
  let skipWaiting = false;
  const worker = {
    addEventListener(name, listener) { listeners.set(name, listener); },
    skipWaiting() { skipWaiting = true; },
    registration: {
      async unregister() { unregistered = true; return true; },
    },
    clients: {
      async matchAll() {
        return [
          { url: "https://www.emanthread.com/women", navigate: async (url) => navigated.push(url) },
          { url: "https://www.emanthread.com/checkout", navigate: async (url) => navigated.push(url) },
        ];
      },
    },
  };
  const cacheStorage = {
    async keys() { return ["pages", "pages-rsc", "next-static-js-assets"]; },
    async delete(key) { deleted.push(key); return true; },
  };
  runInNewContext(readFileSync(workerPath, "utf8"), {
    self: worker,
    caches: cacheStorage,
    URL,
  });

  listeners.get("install")({ waitUntil(promise) { return promise; } });
  let activation;
  listeners.get("activate")({ waitUntil(promise) { activation = promise; } });
  await activation;

  assert.equal(skipWaiting, true);
  assert.deepEqual(deleted, ["pages", "pages-rsc", "next-static-js-assets"]);
  assert.equal(unregistered, true);
  assert.deepEqual(navigated, ["https://www.emanthread.com/women"]);
  assert.equal(listeners.has("fetch"), false);
});
