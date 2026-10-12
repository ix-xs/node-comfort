---
title: "SQLite"
description: "`nc.SQLite` enveloppe le moteur SQLite livré avec Node.js 22.13+. Il n'y a aucun module natif à compiler, et vous disposez d'aides CRUD, de filtres riches, de colonnes JSON, de transactions, de migrations et de sauvegardes."
sidebar:
  order: 2
---

```js
const db = new nc.SQLite("data/app.sqlite");

db.createTable({
  name: "users",
  columns: {
    id: { type: "INTEGER", primaryKey: true, autoincrement: true },
    email: { type: "TEXT", notNull: true, unique: true },
    settings: { type: "JSON", defaultValue: {} },
    active: { type: "BOOLEAN", defaultValue: true },
  },
});

db.insert("users", { email: "ada@example.com", settings: { theme: "dark" } });
const ada = db.get("users", { email: "ada@example.com" });
ada.settings.theme; // "dark"
```

Les méthodes sont synchrones, comme le moteur. `await` fonctionne quand même si vous le préférez. Les valeurs sont toujours passées en paramètres et les noms de tables et de colonnes sont vérifiés : aucune injection SQL ne peut passer par là.

## Ouvrir une base de données

```js
const db = new nc.SQLite();                      // ./db.sqlite
const app = new nc.SQLite("data/app.sqlite");    // les dossiers sont créés
const mem = new nc.SQLite(":memory:");           // jetable, pour les tests
const ro = new nc.SQLite("app.sqlite", { readOnly: true });
const quick = new nc.SQLite("app.sqlite", { synchronous: "NORMAL" });
```

La journalisation write-ahead et les clés étrangères sont activées par défaut. Fermez la connexion avec `db.close()`.

`synchronous` indique avec quelle insistance SQLite pousse chaque commit vers le disque. L'option garde le réglage propre à SQLite, `"FULL"`, tant que vous ne la changez pas. Avec la journalisation write-ahead, `"NORMAL"` accélère les écritures et ne peut pas corrompre le fichier, mais une coupure de courant peut annuler les derniers commits.

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
    token: { type: "TEXT", defaultExpression: "lower(hex(randomblob(16)))" },
  },
  constraints: [{ type: "unique", columns: ["user_id", "title"] }],
  indexes: [{ columns: ["status"] }],
});

db.tables();         // ["posts", "users"]
db.columns("posts"); // [{ name: "id", type: "INTEGER", primaryKey: true, ... }, ...]
```

`createTable` ne fait rien si la table existe déjà. Pour modifier une table, utilisez les migrations.

`defaultValue` est une valeur fixe, à une exception près : `"CURRENT_TIMESTAMP"`, `"CURRENT_DATE"` et `"CURRENT_TIME"` désignent le moment de l'insertion. `defaultExpression` est une valeur par défaut que SQLite calcule pour chaque nouvelle ligne. Elle est écrite telle quelle dans la table : ne la construisez donc jamais à partir d'une saisie utilisateur.

## Lire

```js
db.get("users", { email });                                        // première correspondance, ou undefined
db.getAll("users");                                                // toutes les lignes
db.getAll("posts", { status: "published" }, { orderBy: "created_at", direction: "DESC", limit: 20, offset: 40 });
db.count("users", { active: true });
db.exists("users", { email });
```

Le nom peut aussi être celui d'une vue ou d'une table temporaire. Elles se lisent comme n'importe quelle autre table.

`paginate` renvoie une page, avec ce dont une pagination a besoin pour s'afficher :

```js
const page = db.paginate("posts", { status: "published" }, { page: 2, perPage: 10, orderBy: "created_at", direction: "DESC" });
page.items;   // les 10 lignes de la page 2
page.total;   // 22, le nombre de lignes correspondantes
page.pages;   // 3
page.hasPrev; // true
page.hasNext; // true
```

Les pages commencent à 1, et `perPage` vaut 20 sauf indication contraire. Une page au-delà de la fin donne la dernière. Indiquez toujours un `orderBy` : sans lui, SQLite est libre de renvoyer les lignes dans n'importe quel ordre.

## Filtres

Un filtre est un objet dont chaque clé est une colonne :

```js
db.getAll("users", {
  role: ["admin", "editor"],             // IN
  age: { gte: 18, lt: 65 },              // opérateurs
  deleted_at: null,                      // IS NULL
  $or: [{ email: { like: "%@acme.com" } }, { vip: true }],
});
```

Opérateurs : `eq`, `ne`, `gt`, `gte`, `lt`, `lte`, `in`, `notIn`, `like`, `notLike`, `glob`, `between` et `isNull`. Les booléens et les dates se passent directement.

Une clé contenant des points va chercher à l'intérieur d'une colonne JSON :

```js
db.getAll("users", { "settings.theme": "dark", "settings.langs.0": "en" }, { orderBy: "settings.theme" });
```

`"settings.theme"` est la clé `theme` de la colonne `settings`, et `"settings.langs.0"` le premier élément de son tableau `langs`. Les opérateurs fonctionnent aussi sur ces clés, et `orderBy` les accepte.

## Écrire

```js
const { lastInsertRowid } = db.insert("users", { email, settings: { theme: "dark" } });
db.insertMany("products", rows);                                  // une seule transaction, bien plus rapide
db.update("users", { active: false }, { last_login: { lt: "2025-01-01" } });
db.increment("posts", { views: 1 }, { id: post.id });
db.upsert("settings", { user_id: 1, key: "theme", value: "dark" }, ["user_id", "key"]);
db.delete("sessions", { expires_at: { lt: new Date() } });
```

Les objets et les tableaux sont stockés en JSON, les booléens en 1 et 0, et les dates en chaînes ISO. `update`, `increment` et `delete` refusent un filtre vide : une condition oubliée ne peut donc pas vider une table ; `clearTable()` est là pour le faire volontairement.

`increment` ajoute aux colonnes numériques en une seule instruction : deux requêtes qui arrivent en même temps comptent donc toutes les deux. Lire la valeur, y ajouter puis la réécrire en ferait perdre une. Les nombres négatifs soustraient, et une colonne vide compte pour 0.

Une insertion qui entre en conflit avec une ligne existante échoue, sauf si vous dites quoi faire avec `onConflict` :

```js
db.insert("tags", { label: "news" }, { onConflict: "ignore" });    // changes vaut 0 si elle y était déjà
db.insertMany("tags", labels.map((label) => ({ label })), { onConflict: "ignore" });
db.insert("tags", { id: 1, label: "press" }, { onConflict: "replace" });
```

`"ignore"` saute la ligne. `"replace"` supprime l'ancienne ligne, puis insère la nouvelle. Pour modifier une ligne sur place en conservant ses autres colonnes, utilisez `upsert`.

## JSON, booléens et dates

Les colonnes déclarées `JSON` reviennent déjà analysées, et les colonnes `BOOLEAN` reviennent en `true`/`false`. Passez `{ dates: true }` à l'ouverture de la base pour obtenir aussi des objets `Date` à partir des colonnes `DATE`, `DATETIME` et `TIMESTAMP`.

Les requêtes brutes sont converties de la même façon, jointures et colonnes renommées comprises :

```js
db.queryOne("SELECT p.title, p.tags, u.active AS author_active FROM posts p JOIN users u ON u.id = p.user_id");
// { title: "Hello", tags: ["news"], author_active: true }
```

Sur un Node.js antérieur à 22.16, cela ne fonctionne que pour une requête portant sur une seule table.

Une valeur par défaut `CURRENT_TIMESTAMP` écrit un texte UTC comme `"2026-10-12 10:37:04"`, sans fuseau horaire. Avec `dates: true`, il est relu comme le bon instant. Pour stocker le format ISO qu'ont les dates insérées, utilisez plutôt `defaultExpression: "strftime('%Y-%m-%dT%H:%M:%fZ', 'now')"`.

## Erreurs

Les échecs lèvent une `SQLiteError`. Son `sqliteCode` vous dit ce qui s'est passé :

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

Si la fonction lève une erreur, toutes les modifications sont annulées et l'erreur est levée de nouveau. Les transactions peuvent s'imbriquer : un échec interne que vous interceptez n'annule pas le travail de la transaction externe. Les fonctions asynchrones fonctionnent aussi ; le commit les attend.

Quand plusieurs processus partagent la base et qu'une transaction lit avant d'écrire, passez `{ immediate: true }` :

```js
db.transaction(() => {
  const account = db.get("accounts", { id });
  if (account.balance < amount) throw new Error("Not enough money");
  db.increment("accounts", { balance: -amount }, { id });
}, { immediate: true });
```

Le verrou d'écriture est alors pris tout de suite, et non à la première écriture : les processus s'attendent les uns les autres au lieu d'échouer avec `SQLITE_BUSY`.

## Migrations

`migrate` applique chaque migration une seule fois, dans l'ordre, et enregistre la version dans la base :

```js
db.migrate([
  "CREATE TABLE users (id INTEGER PRIMARY KEY, email TEXT NOT NULL UNIQUE)",
  "ALTER TABLE users ADD COLUMN name TEXT",
  (db) => db.update("users", { name: "unknown" }, { name: null }),
]);
```

N'ajoutez jamais de migrations ailleurs qu'à la fin de la liste. Chacune s'exécute dans sa propre transaction : une migration qui échoue est annulée et laisse les précédentes en place.

## SQL brut

```js
db.exec("UPDATE users SET active = ? WHERE last_login < ?", [false, cutoff]);
db.queryOne("SELECT COUNT(*) AS total FROM orders WHERE paid = ?", true);
db.queryAll("SELECT role, COUNT(*) AS n FROM users GROUP BY role");
for (const row of db.iterate("SELECT * FROM events")) stream.write(JSON.stringify(row));
```

Les paramètres peuvent être un tableau, une valeur seule, ou nommés : `{ $id: 42 }`.

## Lignes typées

```ts
type User = { id: number; email: string; active: boolean };
const db = new nc.SQLite<User>("app.sqlite");
db.getAll("users", { active: true }); // User[], et les filtres suggèrent les colonnes
```

`db.table("users")` renvoie des raccourcis liés à une seule table : `users.get()`, `users.insert()`, `users.paginate()`...

## Maintenance

```js
db.backup(`backups/app-${nc.time.format(new Date(), "YYYY-MM-DD")}.sqlite`); // sans risque pendant l'exécution
db.vacuum();
db.fn("slugify", (text) => nc.str.slugify(String(text)));                   // appeler du JavaScript depuis SQL
db.native;                                                                  // le DatabaseSync sous-jacent
```

Toutes les méthodes et options sont listées dans la [référence](/reference/sqlite/).
