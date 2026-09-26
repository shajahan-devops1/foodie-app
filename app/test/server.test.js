const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const app = require("../src/server");

test("health endpoint", async () => {
  const server = http.createServer(app);
  await new Promise(r=>server.listen(0,r));
  const port=server.address().port;
  const res=await fetch(`http://127.0.0.1:${port}/healthz`);
  assert.equal(res.status,200);
  assert.equal((await res.json()).status,"ok");
  await new Promise(r=>server.close(r));
});

test("restaurants endpoint", async () => {
  const server=http.createServer(app);
  await new Promise(r=>server.listen(0,r));
  const port=server.address().port;
  const res=await fetch(`http://127.0.0.1:${port}/api/restaurants`);
  const body=await res.json();
  assert.equal(res.status,200);
  assert.ok(body.length>0);
  await new Promise(r=>server.close(r));
});