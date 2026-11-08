---
title: "Une tâche planifiée"
description: "Du travail qui tourne tout seul : une file remplie chaque minute, une sauvegarde chaque nuit, et des logs qu'un collecteur sait lire."
sidebar:
  order: 3
---

## Des tâches en arrière-plan

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

## Une sauvegarde chaque nuit

```js
const nc = require("@ix-xs/node-comfort");

const db = new nc.SQLite("data/app.sqlite");

// sauvegarde chaque nuit, conservée 7 jours
nc.time.cron("0 3 * * *", () => {
  db.backup(`backups/app-${nc.time.format(new Date(), "YYYY-MM-DD")}.sqlite`);
  for (const file of nc.glob("backups/*.sqlite", { absolute: true })) {
    if (nc.time.diff(Date.now(), nc.stat(file).mtime, "days") > 7) nc.remove(file);
  }
});
```

`backup()` copie la base pendant que le programme continue de s'en servir, et renvoie le chemin de la copie. La boucle supprime ensuite les copies de plus d'une semaine.

## Des logs structurés en production

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

`redact` remplace les valeurs de ces clés partout où elles apparaissent, à n'importe quelle profondeur. `onLog` reçoit chaque entrée écrite, avec son heure, son niveau, sa portée, son message et les arguments passés.
