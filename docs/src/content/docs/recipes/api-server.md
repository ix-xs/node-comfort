---
title: "An API server"
description: "The pieces of an HTTP service: a configuration checked at startup, request bodies and webhooks checked before use, a database layer, and a clean shutdown."
sidebar:
  order: 1
---

## A configuration you can trust

Check everything at startup, fail with the full list of problems, and use typed values everywhere else.

```js
// config.js
const nc = require("@ix-xs/node-comfort");

module.exports = nc.env.validate({
  NODE_ENV: { type: "enum", values: ["development", "production", "test"], default: "development" },
  PORT: { type: "port", default: 3000 },
  DATABASE_PATH: { type: "string", default: "data/app.sqlite" },
  JWT_SECRET: { type: "string", minLength: 32 },
  CORS_ORIGINS: { type: "list", default: [] },
  REQUEST_TIMEOUT: { type: "duration", default: "10s" },
});
```

## Validating a request body

Works with any framework. Here with Node's own `http` module:

```js
const http = require("node:http");
const nc = require("@ix-xs/node-comfort");
const { schema: s } = nc;

const CreateUser = s.object({
  email: s.string().trim().email().toLowerCase(),
  password: s.string().min(12),
  name: s.string().trim().min(1).max(80),
  newsletter: s.boolean().default(false),
});

http.createServer(async (req, res) => {
  let body = "";
  for await (const chunk of req) body += chunk;

  const result = CreateUser.safeParse(nc.JSONParse(body, null));
  if (!result.success) {
    res.writeHead(400, { "content-type": "application/json" });
    return res.end(JSON.stringify({ errors: result.error.flatten() }));
  }

  const passwordHash = await nc.crypto.hashPassword(result.data.password);
  // save { ...result.data, passwordHash } ...
  res.writeHead(201).end();
}).listen(3000);
```

## Receiving a webhook

The sender signs the body with a secret you share. Check the signature on the raw bytes, before parsing anything.

```js
const http = require("node:http");
const nc = require("@ix-xs/node-comfort");
const { schema: s } = nc;

const Event = s.discriminatedUnion("type", [
  s.object({ type: s.literal("invoice.paid"), invoiceId: s.string() }),
  s.object({ type: s.literal("customer.deleted"), customerId: s.string() }),
]);

http.createServer(async (req, res) => {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks);

  if (!nc.crypto.verifyHmac(raw, req.headers["x-signature"], process.env.WEBHOOK_SECRET)) {
    return res.writeHead(401).end();
  }

  const event = Event.safeParse(nc.JSONParse(raw.toString(), null));
  if (!event.success) return res.writeHead(400).end();

  res.writeHead(204).end(); // answer first, work after
  if (event.data.type === "invoice.paid") await markPaid(event.data.invoiceId);
  else await forget(event.data.customerId);
}).listen(3000);
```

`verifyHmac` compares in constant time and returns `false` for a missing or malformed signature, so there is nothing to check before calling it.

## A small database layer

```js
const nc = require("@ix-xs/node-comfort");

const db = new nc.SQLite("data/app.sqlite");

db.migrate([
  `CREATE TABLE users (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     email TEXT NOT NULL UNIQUE,
     password_hash TEXT NOT NULL,
     settings JSON NOT NULL DEFAULT '{}',
     created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
   )`,
  "CREATE INDEX idx_users_created ON users (created_at)",
]);

const users = db.table("users");

async function register(email, password) {
  try {
    const { lastInsertRowid } = users.insert({ email, password_hash: await nc.crypto.hashPassword(password) });
    return Number(lastInsertRowid);
  } catch (error) {
    if (error.sqliteCode === "SQLITE_CONSTRAINT_UNIQUE") throw new Error("This email is already registered");
    throw error;
  }
}

async function login(email, password) {
  const user = users.get({ email });
  if (!user || !(await nc.crypto.verifyPassword(password, user.password_hash))) return null;
  return nc.crypto.signJWT({ sub: String(user.id) }, process.env.JWT_SECRET, { expiresIn: "1h" });
}
```

## A clean shutdown

```js
const nc = require("@ix-xs/node-comfort");

const server = app.listen(config.PORT, () => nc.success(`Listening on http://localhost:${config.PORT}`));

nc.sys.onShutdown(async () => {
  nc.info("Shutting down");
  await new Promise((done) => server.close(done)); // stop accepting requests
  await jobs.onIdle();                             // let running jobs finish
  db.close();
}, { timeout: "20s" });
```

Handlers run in reverse order of registration, and a second Ctrl+C exits immediately.
