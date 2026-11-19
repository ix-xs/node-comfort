---
title: "SQLite"
description: "`nc.sqlite` : le moteur SQLite intégré à Node.js, avec des fonctions CRUD, des filtres, des colonnes JSON et booléennes, des transactions, des migrations et des sauvegardes. Rien à compiler."
---

```js
const nc = require("@ix-xs/node-comfort");
const { sqlite } = nc;
```

| Membre | |
| --- | --- |
| `open(path?, options?)` | Ouvre une base : identique à `new sqlite.SQLite(path, options)` |
| `SQLite` | La classe, pour typer ou étendre |
| `op` | Des opérateurs de filtre que seul le code peut créer : `op.gte(18)` |

Les méthodes sont synchrones, comme le moteur ; `await` fonctionne quand même. Les valeurs sont toujours liées en paramètres et les noms de tables et de colonnes sont vérifiés : ni les unes ni les autres ne peuvent injecter de SQL.

## Ouvrir

```js
const db = sqlite.open();                                   // ./db.sqlite
const app = sqlite.open(nc.fs.resolve("./data/app.sqlite")); // les dossiers sont créés
const mem = sqlite.open(":memory:");
const ro = sqlite.open("app.sqlite", { readOnly: true });
```

Un chemin relatif se lit depuis le dossier de travail, pas depuis le fichier appelant : passez `nc.fs.resolve()` pour un chemin à côté de votre code ([Conventions](/basics/conventions/)).

| Option | Par défaut | |
| --- | --- | --- |
| `json` | `true` | Analyse les colonnes `JSON` |
| `booleans` | `true` | Renvoie les colonnes `BOOLEAN` en `true`/`false` |
| `dates` | `false` | Renvoie les colonnes `DATE`, `DATETIME` et `TIMESTAMP` en `Date` |
| `wal` | `true` | Journal en écriture anticipée : les lectures n'attendent pas les écritures |
| `foreignKeys` | `true` | Applique les clés étrangères |
| `busyTimeout` | 5 secondes | Attente d'un verrou tenu par une autre connexion, en ms ou en texte |
| `synchronous` | `"FULL"` | `"NORMAL"` écrit plus vite avec `wal` et ne peut pas corrompre le fichier ; une coupure de courant peut annuler les derniers commits |
| `readOnly` | `false` | |
| `operators` | `"plain"` | `"tagged"` : voir [Valeurs venues d'une requête](#values-from-a-request) |

| Propriété ou méthode | |
| --- | --- |
| `db.path` | Chemin absolu, ou `":memory:"` |
| `db.isOpen` | Si la connexion est ouverte |
| `db.close()` | La ferme |
| `db.native` | Le `DatabaseSync` de `node:sqlite` sous-jacent |

## Tables

```js
db.createTable({
  name: "posts",
  columns: {
    id: { type: "INTEGER", primaryKey: true, autoincrement: true },
    user_id: { type: "INTEGER", notNull: true, references: { table: "users", column: "id" }, onDelete: "CASCADE" },
    title: { type: "TEXT", notNull: true },
    status: { type: "TEXT", values: ["draft", "published"], defaultValue: "draft" },
    tags: { type: "JSON", defaultValue: [] },
    views: { type: "INTEGER", defaultValue: 0, check: "views >= 0" },
    created_at: { type: "DATETIME", defaultValue: "CURRENT_TIMESTAMP" },
  },
  constraints: [{ type: "unique", columns: ["user_id", "title"] }],
  indexes: [{ columns: ["status"] }],
});

db.tables();         // ["posts", "users"]
db.columns("posts"); // [{ name: "id", type: "INTEGER", notNull: false, defaultValue: null, primaryKey: true }, ...]
```

| Clé de colonne | |
| --- | --- |
| `type` | `INTEGER`, `TEXT`, `REAL`, `BLOB`, `NUMERIC`, `JSON`, `BOOLEAN`, `DATETIME`, ou tout type SQLite comme `VARCHAR(255)` |
| `primaryKey`, `autoincrement`, `notNull`, `unique` | Contraintes |
| `defaultValue` | Une valeur fixe ; `"CURRENT_TIMESTAMP"`, `"CURRENT_DATE"` et `"CURRENT_TIME"` désignent le moment de l'insertion |
| `defaultExpression` | Du SQL calculé pour chaque ligne, écrit tel quel : jamais à partir d'une saisie |
| `values` | Valeurs autorisées |
| `check` | Une expression `CHECK` |
| `references`, `onDelete`, `onUpdate` | Clé étrangère |

`constraints` accepte `{ type: "unique" | "primaryKey", columns }`, `{ type: "check", expression }` et `{ type: "foreignKey", columns, references: { table, columns } }` ; `indexes` accepte ce qu'accepte `createIndex`.

| Méthode | |
| --- | --- |
| `createTable(definition)` | Ne fait rien si la table existe. Une table se modifie par des migrations |
| `createIndex(table, { columns, unique, name, where })` | Sauf s'il existe ; `where` en fait un index partiel |
| `deleteTable(table)` | La supprime |
| `clearTable(table)` | Supprime toutes les lignes, garde la table |
| `hasTable(table)`, `tables()`, `columns(table)` | Inspectent le schéma |

## Lire

```js
db.get("users", { email });   // première correspondance, ou undefined
db.getAll("users");           // toutes les lignes
db.getAll("posts", { status: "published" }, { orderBy: "created_at", direction: "DESC", limit: 20, offset: 40 });
db.count("users", { active: true });
db.exists("users", { email });

const page = db.paginate("posts", { status: "published" }, { page: 2, perPage: 10, orderBy: "id", direction: "DESC" });
// { items: [10 lignes], page: 2, perPage: 10, total: 22, pages: 3, hasPrev: true, hasNext: true }
```

| Option de lecture | |
| --- | --- |
| `orderBy`, `direction` | Colonne (un chemin JSON fonctionne) et `"ASC"` ou `"DESC"` |
| `limit`, `offset` | `getAll` |
| `page`, `perPage` | `paginate` : les pages commencent à 1, `perPage` vaut 20 par défaut, une page au-delà de la fin donne la dernière |

Le nom de table peut être une vue ou une table temporaire. Donnez un `orderBy` à `paginate` : sans lui, SQLite renvoie les lignes dans n'importe quel ordre.

## Filtres

Chaque clé d'un filtre est une colonne :

```js
db.getAll("users", {
  role: ["admin", "editor"],  // IN
  age: { gte: 18, lt: 65 },   // opérateurs
  deleted_at: null,           // IS NULL
  $or: [{ email: { like: "%@acme.com" } }, { vip: true }],
});

db.getAll("users", { "settings.theme": "dark", "settings.langs.0": "en" }, { orderBy: "settings.theme" });
```

| Filtre | |
| --- | --- |
| `value` | Égal ; booléens et dates sont convertis |
| `[a, b]` | L'un de |
| `null` | `IS NULL` |
| `{ eq, ne, gt, gte, lt, lte, in, notIn, like, notLike, glob, between, isNull }` | Opérateurs, combinés par AND |
| `$or`, `$and` | Listes de filtres |
| `"column.key.0"` | Une clé dans une colonne JSON, avec tous les opérateurs et dans `orderBy` |

### Valeurs venues d'une requête

Par défaut, tout objet avec une clé d'opérateur est un opérateur : si `req.body.token` vaut `{ "ne": "" }`, `{ token: req.body.token }` trouve toutes les lignes qui ont un jeton. Vérifiez ces valeurs d'abord ([schémas](/data/schema/)), ou ouvrez la base avec `operators: "tagged"` : seuls les opérateurs créés par `op` comptent, et tout autre objet ou tableau est une valeur, comparée comme texte JSON.

```js
const { op } = sqlite;
const db = sqlite.open("data/app.sqlite", { operators: "tagged" });

db.getAll("users", { age: op.between(18, 65), role: op.in(["admin", "editor"]), deleted_at: op.isNull() });
db.get("users", { email, token: req.body.token }); // { "ne": "" } est une valeur ; undefined lève une erreur
```

`op` fournit `eq`, `ne`, `gt`, `gte`, `lt`, `lte`, `in`, `notIn`, `like`, `notLike`, `glob`, `between`, `isNull` et `notNull`. Ils fonctionnent dans les deux modes et se combinent par décomposition : `{ ...op.gte(18), ...op.lt(65) }`. Avec `"tagged"`, une valeur `undefined` dans une lecture lève une erreur, comme dans les écritures ; dans le mode par défaut, elle retire sa condition.

## Écrire

```js
const { lastInsertRowid } = db.insert("users", { email, settings: { theme: "dark" } });
db.insertMany("products", rows);
db.update("users", { active: false }, { last_login: { lt: "2025-01-01" } });
db.increment("posts", { views: 1 }, { id: post.id });
db.upsert("settings", { user_id: 1, key: "theme", value: "dark" }, ["user_id", "key"]);
db.delete("sessions", { expires_at: { lt: new Date() } });
```

| Méthode | Renvoie | |
| --- | --- | --- |
| `insert(table, data, { onConflict })` | `{ ok, changes, lastInsertRowid }` | `onConflict` : `"ignore"` saute la ligne, `"replace"` supprime d'abord l'ancienne |
| `insertMany(table, rows, { onConflict })` | `{ ok, changes }` | Une seule transaction |
| `update(table, data, where)` | `{ ok, changes }` | Les valeurs `undefined` sont ignorées |
| `increment(table, { column: n }, where)` | `{ ok, changes }` | Une seule instruction : des incréments simultanés comptent tous ; un nombre négatif soustrait |
| `upsert(table, data, conflict)` | `{ ok, changes, lastInsertRowid }` | Insère, ou met à jour sur place en cas de conflit sur les colonnes `conflict`, qui doivent former une clé primaire ou une contrainte d'unicité |
| `delete(table, where)` | `{ ok, changes }` | |

Les objets et tableaux sont stockés en JSON, les booléens en 1 et 0, les dates en texte ISO. `update`, `increment` et `delete` lèvent une `SQLiteError` pour un filtre qui toucherait toutes les lignes : un filtre vide, `{ id: undefined }`, un `$or` ou un `$and` vide, `{ id: { notIn: [] } }`.

```js
db.delete("sessions", { user_id: req.user?.id }); // lève une erreur si req.user manque
db.clearTable("sessions");                         // toutes les lignes, volontairement
```

## JSON, booléens et dates

Les colonnes `JSON` reviennent analysées, les colonnes `BOOLEAN` en booléens et, avec `{ dates: true }`, les colonnes de date en `Date`. Les requêtes brutes sont converties aussi, jointures et alias compris (avant Node.js 22.16, seulement pour une requête sur une table) :

```js
db.queryOne("SELECT p.title, p.tags, u.active AS author_active FROM posts p JOIN users u ON u.id = p.user_id");
// { title: "Post 1", tags: ["news"], author_active: true }
```

Une valeur par défaut `CURRENT_TIMESTAMP` écrit un texte UTC sans fuseau (`"2026-10-12 10:37:04"`), relu au bon moment avec `dates: true`. Pour le format ISO des dates insérées : `defaultExpression: "strftime('%Y-%m-%dT%H:%M:%fZ', 'now')"`.

## Erreurs

Les échecs lèvent une `SQLiteError` (`code` `ERR_SQLITE`) avec `sql` et `sqliteCode` :

```js
try {
  db.insert("users", { email });
} catch (error) {
  if (error.sqliteCode === "SQLITE_CONSTRAINT_UNIQUE") return "Email already taken";
  throw error;
}
```

## Transactions

```js
db.transaction(() => {
  db.increment("accounts", { balance: -amount }, { id: from.id });
  db.increment("accounts", { balance: amount }, { id: to.id });
});
```

Une fonction qui lève une erreur annule tout, et l'erreur est relancée. La valeur renvoyée par la fonction est renvoyée. Les transactions s'imbriquent : un échec intérieur que vous attrapez n'annule pas le travail extérieur. Une fonction async fonctionne ; le commit l'attend. `db.inTransaction` indique si une transaction est ouverte.

Quand plusieurs processus partagent le fichier et qu'une transaction lit avant d'écrire, passez `{ immediate: true }` : le verrou d'écriture est pris tout de suite, et les processus s'attendent au lieu d'échouer avec `SQLITE_BUSY`.

## Migrations

```js
db.migrate([
  "CREATE TABLE users (id INTEGER PRIMARY KEY, email TEXT NOT NULL UNIQUE)",
  "ALTER TABLE users ADD COLUMN name TEXT",
  (db) => db.update("users", { name: "unknown" }, { name: null }),
]);
// { from: 0, to: 3 }, puis { from: 3, to: 3 } au démarrage suivant
```

Chaque migration s'exécute une fois, dans l'ordre, dans sa propre transaction ; la version est stockée dans `PRAGMA user_version` et se lit avec `db.version`. Une migration qui échoue est annulée, les précédentes restent. N'ajoutez des migrations qu'à la fin de la liste.

## SQL brut

```js
db.exec("UPDATE users SET active = ? WHERE last_login < ?", [false, cutoff]); // { changes, lastInsertRowid }
db.queryOne("SELECT COUNT(*) AS total FROM orders WHERE paid = ?", true);   // { total: 2 }
db.queryAll("SELECT role, COUNT(*) AS n FROM users GROUP BY role");
for (const row of db.iterate("SELECT * FROM events")) stream.write(JSON.stringify(row));
```

Les paramètres sont un tableau, une valeur seule, ou nommés : `{ $id: 42 }`.

## Lignes typées

```ts
type User = { id: number; email: string; active: boolean };
const db = nc.sqlite.open<User>("app.sqlite");
db.getAll("users", { active: true }); // User[], et les filtres proposent les colonnes
```

`db.table("users")` lie les fonctions à une table : `name`, `get`, `getAll`, `paginate`, `insert`, `insertMany`, `update`, `increment`, `upsert`, `delete`, `count`, `exists` et `clear`.

## Maintenance

```js
db.backup(`backups/app-${nc.time.format(new Date(), "YYYY-MM-DD")}.sqlite`); // chemin absolu de la copie
db.vacuum();
db.fn("slugify", (text) => nc.str.slugify(String(text)));
db.queryOne("SELECT slugify(title) AS slug FROM posts WHERE id = 3");        // { slug: "post-3" }
```

| Méthode | |
| --- | --- |
| `backup(path)` | Copie la base pendant qu'elle tourne. Le fichier ne doit pas exister ; un chemin relatif se lit depuis le dossier de travail |
| `vacuum()` | Récupère l'espace inutilisé |
| `fn(name, implementation, { deterministic, varargs })` | Une fonction JavaScript appelable depuis le SQL |

## Point d'entrée

`@ix-xs/node-comfort/sqlite` exporte la classe elle-même, avec `open` et `op` en membres statiques :

```js
const SQLite = require("@ix-xs/node-comfort/sqlite");
const db = SQLite.open(":memory:");
const { op } = SQLite;
```

En modules ES, importez-la comme export par défaut (`import SQLite from "@ix-xs/node-comfort/sqlite"`) : `open` et `op` ne sont pas des exports nommés de ce point d'entrée.

## Avant 3.0

| 2.2 | 3.0 |
| --- | --- |
| `nc.SQLite` | `nc.sqlite.SQLite` |
| `new nc.SQLite(path, options)` | `nc.sqlite.open(path, options)` |
| `nc.SQLite.op` | `nc.sqlite.op` |
| `db.set(table, data, where)` | `db.upsert(table, data, conflict)`, ou `db.get()` puis `db.update()` ou `db.insert()` |
| `createTable({ options })` | `createTable({ columns })` |

`db.set` cherchait la ligne par `where` (ou par `data.id`) et n'avait besoin d'aucune colonne unique. `upsert` est une seule instruction atomique et exige une clé primaire ou une contrainte d'unicité sur les colonnes `conflict`. Les anciens noms fonctionnent jusqu'à 4.0, avec un avertissement ([Passer à 3.0](/help/upgrade-3-0/)).
