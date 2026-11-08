---
title: "Un serveur d'API"
description: "Les pièces d'un service HTTP : une configuration vérifiée au démarrage, des corps de requête et des webhooks vérifiés avant usage, une couche de base de données, et un arrêt propre."
sidebar:
  order: 1
---

## Une configuration digne de confiance

Vérifiez tout au démarrage, échouez avec la liste complète des problèmes et utilisez des valeurs typées partout ailleurs.

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

## Valider le corps d'une requête

Fonctionne avec n'importe quel framework. Ici, avec le module `http` fourni par Node :

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
  // enregistrez { ...result.data, passwordHash } ...
  res.writeHead(201).end();
}).listen(3000);
```

## Recevoir un webhook

L'émetteur signe le corps avec un secret que vous partagez. Vérifiez la signature sur les octets bruts, avant d'analyser quoi que ce soit.

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

  res.writeHead(204).end(); // répondre d'abord, travailler ensuite
  if (event.data.type === "invoice.paid") await markPaid(event.data.invoiceId);
  else await forget(event.data.customerId);
}).listen(3000);
```

`verifyHmac` compare en temps constant et renvoie `false` pour une signature absente ou mal formée : il n'y a donc rien à vérifier avant de l'appeler.

## Une petite couche de base de données

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

## Un arrêt propre

```js
const nc = require("@ix-xs/node-comfort");

const server = app.listen(config.PORT, () => nc.success(`Listening on http://localhost:${config.PORT}`));

nc.sys.onShutdown(async () => {
  nc.info("Shutting down");
  await new Promise((done) => server.close(done)); // ne plus accepter de requêtes
  await jobs.onIdle();                             // laisser les tâches en cours se terminer
  db.close();
}, { timeout: "20s" });
```

Les gestionnaires s'exécutent dans l'ordre inverse de leur enregistrement, et un second Ctrl+C quitte immédiatement.
