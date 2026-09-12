# Recipes

Complete examples that combine several namespaces. Copy them, then trim what you don't need. The ones that use `await` at the top level are ES modules (`.mjs`, or `"type": "module"` in your package.json).

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

## A command-line tool

```js
#!/usr/bin/env node
// build-images.mjs
import nc from "@ix-xs/node-comfort";

const { cli } = nc;

const { flags, positionals } = cli.args({
  out: { type: "string", short: "o", default: "dist", description: "Output folder" },
  minify: { type: "boolean", description: "Minify the output" },
  concurrency: { type: "number", short: "c", default: 4 },
}, { name: "build-images", usage: "<folder> [options]", version: "1.0.0" });

const source = positionals[0] ?? (await cli.prompt("Folder to process?", { default: "images" }));
const files = nc.glob("**/*.{png,jpg}", { cwd: source, absolute: true });

if (!files.length) {
  nc.warn(`No images in ${source}`);
  process.exit(0);
}
if (cli.isInteractive() && !(await cli.confirm(`Process ${files.length} images?`, { default: true }))) process.exit(0);

const bar = cli.progress({ total: files.length, format: "{bar} {percent}% {label}" });
await nc.async.forEach(files, async (file) => {
  await optimize(file, nc.fs.createPath(`${flags.out}/${nc.str.slugify(file)}`));
  bar.tick(1, file);
}, { concurrency: flags.concurrency });
bar.stop();

nc.box(`${files.length} images written to ${flags.out}`, { title: "done", borderColor: "green" });
```

## An API client with retries and caching

```js
// github.mjs
import nc from "@ix-xs/node-comfort";

const github = nc.http.create({
  baseURL: "https://api.github.com/",
  headers: { "x-github-api-version": "2022-11-28" },
  auth: { bearer: process.env.GITHUB_TOKEN },
  timeout: "10s",
  retry: { attempts: 4 },
});

const repos = new nc.Cache({ max: 500, ttl: "10m" });

async function getRepo(fullName) {
  return repos.getOrSet(fullName, async () => (await github.get(`repos/${fullName}`)).data);
}

const names = ["nodejs/node", "microsoft/TypeScript", "vitejs/vite"];
const results = await nc.async.map(names, getRepo, { concurrency: 2 });
nc.table(results.map((r) => ({ name: r.full_name, stars: nc.num.abbreviate(r.stargazers_count) })));
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

// nightly backup, kept for 7 days
nc.time.cron("0 3 * * *", () => {
  db.backup(`backups/app-${nc.time.format(new Date(), "YYYY-MM-DD")}.sqlite`);
  for (const file of nc.glob("backups/*.sqlite", { absolute: true })) {
    if (nc.time.diff(Date.now(), nc.stat(file).mtime, "days") > 7) nc.remove(file);
  }
});
```

## Background jobs

```js
const nc = require("@ix-xs/node-comfort");

const jobs = nc.async.queue({ concurrency: 3, timeout: "2m" });
const log = nc.createLogger({ scope: "jobs" });

nc.time.every("1m", async () => {
  const pending = db.getAll("emails", { sent_at: null }, { limit: 50 });
  for (const email of pending) {
    jobs.add(() => nc.func.retry(() => send(email), { attempts: 3, delay: 2000 }))
      .then(() => db.update("emails", { sent_at: new Date() }, { id: email.id }))
      .catch((error) => log.error(`Email ${email.id} failed`, error));
  }
}, { immediate: true, onError: (error) => log.error(error) });
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

## Structured logs in production

```js
const nc = require("@ix-xs/node-comfort");

nc.configure({
  format: nc.env.isProduction() ? "json" : "pretty",
  fields: { service: "billing", version: require("./package.json").version },
  file: nc.env.isProduction() ? undefined : "logs/dev.log",
});

const requestLog = nc.createLogger({ scope: "http" });
requestLog.info("GET /invoices", { status: 200, ms: 14 });
```
