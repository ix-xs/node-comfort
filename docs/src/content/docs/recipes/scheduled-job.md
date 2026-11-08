---
title: "A scheduled job"
description: "Work that runs on its own: a queue fed every minute, a backup every night, and logs that a collector can read."
sidebar:
  order: 3
---

## Background jobs

```js
const nc = require("@ix-xs/node-comfort");

const jobs = nc.async.queue({ concurrency: 3, timeout: "2m" });
const log = nc.createLogger({ scope: "jobs" });

nc.time.every("1m", async () => {
  const pending = db.getAll("emails", { sent_at: null }, { limit: 50 });
  for (const email of pending) {
    jobs.add(() => nc.func.retry(() => send(email), { attempts: 3, delay: "2s" }))
      .then(() => db.update("emails", { sent_at: new Date() }, { id: email.id }))
      .catch((error) => log.error(`Email ${email.id} failed`, error));
  }
}, { immediate: true, onError: (error) => log.error(error) });
```

## A nightly backup

```js
const nc = require("@ix-xs/node-comfort");

const db = new nc.SQLite("data/app.sqlite");

// nightly backup, kept for 7 days
nc.time.cron("0 3 * * *", () => {
  db.backup(`backups/app-${nc.time.format(new Date(), "YYYY-MM-DD")}.sqlite`);
  for (const file of nc.glob("backups/*.sqlite", { absolute: true })) {
    if (nc.time.diff(Date.now(), nc.stat(file).mtime, "days") > 7) nc.remove(file);
  }
});
```

`backup()` copies the database while the program keeps using it, and returns the path of the copy. The loop then deletes the copies older than a week.

## Structured logs in production

```js
const nc = require("@ix-xs/node-comfort");

nc.configure({
  format: nc.env.isProduction() ? "json" : "pretty",
  fields: { service: "billing", version: require("./package.json").version },
  file: nc.env.isProduction() ? undefined : "logs/dev.log",
  redact: ["password", "authorization", "token"],
  onLog: (entry) => {
    if (entry.level === "error" || entry.level === "fatal") reportToYourErrorTracker(entry);
  },
});

const requestLog = nc.createLogger({ scope: "http" });
requestLog.info("GET /invoices", { status: 200, ms: 14 });
requestLog.info("POST /login", { email: "ada@example.com", password: "hunter2" }); // password: "[redacted]"
```

`redact` replaces the values of these keys wherever they appear, at any depth. `onLog` receives every entry that is written, with its time, level, scope, message and the arguments that were passed.
