import { readdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
const files = [
  "/",
  "/index.html",
  ...(await readdir("dist/assets")).map((n) => "/assets/" + n),
];
const version = createHash("sha256")
  .update('sw-v2' + JSON.stringify(files))
  .digest("hex")
  .slice(0, 12);
await writeFile(
  "dist/sw.js",
  `const CACHE='contas-${version}';const FILES=${JSON.stringify(files)};
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('contas-')&&k!==CACHE).map(k=>caches.delete(k)))));});
self.addEventListener('fetch',e=>{if(e.request.method==='GET'&&new URL(e.request.url).origin===self.location.origin)e.respondWith(fetch(e.request).catch(()=>caches.open(CACHE).then(c=>c.match(e.request,{ignoreVary:true}).then(r=>r||(e.request.mode==='navigate'?c.match('/index.html'):Response.error())))));});`,
);
