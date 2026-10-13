---
title: "SQLite"
description: "SQLite rendu agréable, sur le moteur intégré à Node.js (22.13+) : CRUD avec des filtres riches, colonnes JSON et booléennes, transactions, migrations et sauvegardes. Les méthodes sont synchrones, comme le moteur, mais `await` fonctionne quand même. Les erreurs sont des `SQLiteError`. Les valeurs sont toujours liées comme paramètres et les noms sont vérifiés, aucune injection SQL ne peut donc passer par eux."
sidebar:
  label: "SQLite"
  order: 19
---

```js
const { SQLite } = require("@ix-xs/node-comfort");
// ou seul, ce qui ne charge rien d'autre
const SQLite = require("@ix-xs/node-comfort/sqlite");
```

Cette page liste tout ce que contient `SQLite`, tel que votre éditeur l'affiche. Pour les explications et des exemples plus longs, lisez [le guide](/system/sqlite/).

```js
const db = new nc.SQLite("data/app.sqlite");
db.createTable({
  name: "users",
  columns: {
    id: { type: "INTEGER", primaryKey: true, autoincrement: true },
    email: { type: "TEXT", notNull: true, unique: true },
    settings: { type: "JSON", defaultValue: {} },
  },
});
db.insert("users", { email: "ada@example.com", settings: { theme: "dark" } });
db.getAll("users", { email: { like: "%@example.com" } }, { orderBy: "email", limit: 20 });
```

## constructor

```ts
new SQLite<R = Record<string, any>>(path?: string, options?: SQLiteOptions): SQLite<R>
```

Ouvre une base de données, en créant le fichier et ses dossiers si nécessaire. Utilisez `":memory:"` pour une base en mémoire jetable.

| Paramètre | Type | Description |
| --- | --- | --- |
| `path?` | `string` | Relatif au répertoire de travail. Par défaut : `"db.sqlite"`. |
| `options?` | [`SQLiteOptions`](#sqliteoptions) |  |

**Lève** `SQLiteError` : Si le fichier ne peut pas être ouvert.

```js
const db = new nc.SQLite();                                  // ./db.sqlite
const app = new nc.SQLite("data/app.sqlite", { dates: true });
const mem = new nc.SQLite(":memory:");
```

## exec

```ts
exec(sql: string, params?: string | number | bigint | boolean | unknown[] | Record<string, unknown> | Date | null): { changes: number; lastInsertRowid: number | bigint; }
```

Exécute du SQL qui ne renvoie pas de lignes. Sans paramètres, vous pouvez passer plusieurs instructions à la fois.

| Paramètre | Type | Description |
| --- | --- | --- |
| `sql` | `string` |  |
| `params?` | `unknown[] \| ``Record``<string, unknown> \| string \| number \| bigint \| boolean \| ``Date`` \| null` | Un tableau, des paramètres nommés comme `{ $id: 1 }`, ou une seule valeur. |

**Lève** `SQLiteError`

```js
db.exec("UPDATE users SET active = ? WHERE last_login < ?", [false, cutoff]);
db.exec("DELETE FROM sessions WHERE user_id = $id", { $id: 42 });
db.exec(`
  CREATE TABLE tags (id INTEGER PRIMARY KEY, label TEXT UNIQUE);
  CREATE INDEX idx_tags_label ON tags (label);
`);
```

## queryOne

```ts
queryOne<T = R>(sql: string, params?: string | number | bigint | boolean | unknown[] | Record<string, unknown> | Date | null): T | undefined
```

Exécute une requête et renvoie la première ligne. Les colonnes JSON et booléennes sont converties comme dans `get()`, jointures et colonnes renommées comprises. Sur Node.js avant 22.16, cela ne fonctionne que pour une requête sur une seule table.

**Lève** `SQLiteError`

```js
const user = db.queryOne("SELECT * FROM users WHERE email = ?", [email]);
```

## queryAll

```ts
queryAll<T = R>(sql: string, params?: string | number | bigint | boolean | unknown[] | Record<string, unknown> | Date | null): T[]
```

Exécute une requête et renvoie toutes les lignes.

**Lève** `SQLiteError`

```js
const stats = db.queryAll("SELECT role, COUNT(*) AS n FROM users GROUP BY role");
```

## iterate

```ts
iterate<T = R>(sql: string, params?: string | number | bigint | boolean | unknown[] | Record<string, unknown> | Date | null): Generator<T, void, undefined>
```

Parcourt les lignes d'une requête une à une, sans les charger toutes. Pour les gros exports.

**Lève** `SQLiteError`

```js
for (const row of db.iterate("SELECT * FROM events WHERE day = ?", [day])) {
  stream.write(JSON.stringify(row) + "\n");
}
```

## createTable

```ts
createTable(table: TableDefinition): { ok: true; }
```

Crée une table avec ses contraintes et ses index, sauf si elle existe déjà. Pour modifier une table existante, utilisez `migrate()`.

**Lève** `SQLiteError` : Si la définition est invalide.

```js
db.createTable({
  name: "posts",
  columns: {
    id: { type: "INTEGER", primaryKey: true, autoincrement: true },
    user_id: { type: "INTEGER", notNull: true, references: { table: "users", column: "id" }, onDelete: "CASCADE" },
    status: { type: "TEXT", values: ["draft", "published"], defaultValue: "draft" },
    tags: { type: "JSON", defaultValue: [] },
  },
  indexes: [{ columns: ["user_id", "status"] }],
});
```

## createIndex

```ts
createIndex(tableName: string, index: IndexDefinition): { ok: true; }
```

Crée un index, sauf s'il existe déjà.

**Lève** `SQLiteError`

```js
db.createIndex("users", { columns: ["email"], unique: true });
db.createIndex("posts", { columns: ["slug"], unique: true, where: "deleted_at IS NULL" });
```

## deleteTable

```ts
deleteTable(tableName: string): { ok: true; }
```

Supprime une table et tout ce qu'elle contient.

**Lève** `SQLiteError` : Si la table n'existe pas.

## clearTable

```ts
clearTable(tableName: string): { ok: true; }
```

Supprime toutes les lignes, en conservant la table.

**Lève** `SQLiteError` : Si la table n'existe pas.

## hasTable

```ts
hasTable(tableName: string): boolean
```

La table existe-t-elle ?

## tables

```ts
tables(): string[]
```

Les tables de la base de données, triées.

## columns

```ts
columns(tableName: string): ColumnInfo[]
```

Les colonnes d'une table.

**Lève** `SQLiteError` : Si la table n'existe pas.

```js
db.columns("users");
// [{ name: "id", type: "INTEGER", notNull: false, defaultValue: null, primaryKey: true }, ...]
```

## get

```ts
get<T = R>(tableName: string, where?: Where<R>, options?: Pick<QueryOptions, "columns" | "orderBy" | "direction">): T | undefined
```

La première ligne qui correspond.

**Lève** `SQLiteError`

```js
const user = db.get("users", { email: "ada@example.com" });
const latest = db.get("posts", { status: "published" }, { orderBy: "created_at", direction: "DESC" });
```

## getAll

```ts
getAll<T = R>(tableName: string, where?: Where<R>, options?: QueryOptions): T[]
```

Les lignes qui correspondent, avec tri et pagination.

**Lève** `SQLiteError`

```js
db.getAll("users");
db.getAll("users", { role: ["admin", "editor"], age: { gte: 18 } });
db.getAll("posts", { $or: [{ pinned: true }, { views: { gt: 1000 } }] }, {
  orderBy: [["views", "DESC"], "title"],
  limit: 20,
  offset: 40,
});
```

## paginate

```ts
paginate<T = R>(tableName: string, where?: Where<R>, options?: PaginateOptions): Page<T>
```

Une page des lignes qui correspondent, avec ce dont un composant de pagination a besoin pour s'afficher.

**Renvoie** [`Page`](/reference/arr/#page)`<``T``>` : Une page au-delà de la fin donne la dernière.

**Lève** `SQLiteError`

```js
const { items, pages, hasNext } = db.paginate("posts", { status: "published" }, {
  page: 3,
  perPage: 20,
  orderBy: "created_at",
  direction: "DESC",
});
```

## count

```ts
count(tableName: string, where?: Where<R>): number
```

Compte les lignes qui correspondent.

**Lève** `SQLiteError`

```js
db.count("users", { active: true });
```

## exists

```ts
exists(tableName: string, where?: Where<R>): boolean
```

Au moins une ligne correspond-elle ?

**Lève** `SQLiteError`

```js
if (db.exists("users", { email })) throw new Error("Email already registered");
```

## insert

```ts
insert(tableName: string, data: Partial<R> & Record<string, unknown>, options?: InsertOptions): InsertResult
```

Insère une ligne. Les objets et tableaux sont stockés en JSON, les booléens en 1 et 0, les dates en chaînes ISO. Les valeurs `undefined` sont ignorées, les valeurs par défaut des colonnes s'appliquent donc.

**Lève** `SQLiteError` : En cas d'échec d'une contrainte ; `sqliteCode` vous dit laquelle, par exemple `"SQLITE_CONSTRAINT_UNIQUE"`.

```js
const { lastInsertRowid } = db.insert("users", { email: "ada@example.com", settings: { theme: "dark" } });
db.insert("tags", { label: "news" }, { onConflict: "ignore" }); // pas d'erreur si elle existe déjà
```

## insertMany

```ts
insertMany(tableName: string, rows: Iterable<Partial<R> & Record<string, unknown>>, options?: InsertOptions): ChangeResult
```

Insère de nombreuses lignes en une seule transaction : tout ou rien, et bien plus rapide qu'une par une.

**Lève** `SQLiteError` : Si une ligne échoue ; rien n'est alors inséré.

```js
db.insertMany("products", rowsFromCsv);
db.insertMany("tags", labels.map((label) => ({ label })), { onConflict: "ignore" });
```

## update

```ts
update(tableName: string, data: Partial<R> & Record<string, unknown>, where: Where<R>): ChangeResult
```

Met à jour les lignes qui correspondent. Le filtre est obligatoire, une condition oubliée ne peut donc pas réécrire toute la table.

| Paramètre | Type | Description |
| --- | --- | --- |
| `tableName` | `string` |  |
| `data` | `Partial``<``R``> & ``Record``<string, unknown>` | Les valeurs `undefined` sont ignorées. |
| `where` | [`Where`](#where)`<``R``>` |  |

**Lève** `SQLiteError`

```js
db.update("users", { active: false }, { last_login: { lt: "2025-01-01" } });
```

## upsert

```ts
upsert(tableName: string, data: Partial<R> & Record<string, unknown>, conflict: string[]): InsertResult
```

Insère une ligne, ou la met à jour sur place si elle entre en conflit avec une ligne existante sur les colonnes `conflict`.

| Paramètre | Type | Description |
| --- | --- | --- |
| `tableName` | `string` |  |
| `data` | `Partial``<``R``> & ``Record``<string, unknown>` |  |
| `conflict` | `string[]` | Les colonnes uniques qui identifient la ligne. |

**Lève** `SQLiteError` : Si `conflict` ne correspond pas à une contrainte d'unicité.

```js
db.upsert("settings", { user_id: 1, key: "theme", value: "dark" }, ["user_id", "key"]);
```

## set

```ts
set(tableName: string, data: Partial<R> & Record<string, unknown>, where?: Where<R> | null): { ok: true; }
```

Met à jour la ligne correspondant à `where` (ou `{ id: data.id }`), ou l'insère. Conservée depuis la 1.x ; `upsert()` fait la même chose en une seule instruction atomique.

**Lève** `SQLiteError`

## delete

```ts
delete(tableName: string, where: Where<R>): ChangeResult
```

Supprime les lignes qui correspondent. Le filtre est obligatoire ; `clearTable()` supprime tout, volontairement.

**Lève** `SQLiteError`

```js
db.delete("sessions", { expires_at: { lt: new Date() } });
```

## increment

```ts
increment(tableName: string, amounts: Partial<Record<keyof R & string, number>> & Record<string, number>, where: Where<R>): ChangeResult
```

Ajoute aux colonnes numériques en une seule instruction, deux requêtes simultanées comptent donc toutes les deux. Lire la valeur, l'augmenter puis la réécrire ferait perdre l'une des deux. Les nombres négatifs soustraient ; une colonne vide compte pour 0.

| Paramètre | Type | Description |
| --- | --- | --- |
| `tableName` | `string` |  |
| `amounts` | `Partial``<``Record``<keyof ``R`` & string, number>> & ``Record``<string, number>` | Les noms des colonnes et la quantité à ajouter. |
| `where` | [`Where`](#where)`<``R``>` |  |

**Lève** `SQLiteError`

```js
db.increment("posts", { views: 1 }, { id: post.id });
db.increment("accounts", { balance: -25, withdrawals: 1 }, { id: account.id });
```

## table

```ts
table<T = R>(tableName: string): TableHandle<T>
```

Des raccourcis liés à une table, pour ne pas répéter son nom.

| Paramètre | Type | Description |
| --- | --- | --- |
| `tableName` | `string` | La table peut être créée plus tard. |

```js
const users = db.table("users"); // in TypeScript: db.table<User>("users")
users.insert({ email: "ada@example.com" });
users.count({ active: true });
```

## transaction

```ts
transaction<T>(callback: () => T, options?: TransactionOptions): T
```

Exécute `callback` dans une transaction : toutes ses modifications sont enregistrées ensemble, ou aucune s'il lève une erreur. L'erreur est alors levée de nouveau. Les transactions peuvent s'imbriquer ; un échec interne peut être intercepté sans perdre le travail externe.

| Paramètre | Type | Description |
| --- | --- | --- |
| `callback` | `() => ``T` | Peut être asynchrone ; le commit l'attend alors. |
| `options?` | [`TransactionOptions`](#transactionoptions) |  |

**Lève** Ce que `callback` a levé, après annulation de la transaction.

```js
db.transaction(() => {
  db.increment("accounts", { balance: -amount }, { id: from.id });
  db.increment("accounts", { balance: amount }, { id: to.id });
});
```

## inTransaction

```ts
inTransaction: boolean
```

Indique si une transaction est ouverte.

## migrate

```ts
migrate(migrations: Migration[]): { from: number; to: number; }
```

Applique les migrations dans l'ordre, chacune une seule fois. La version courante est conservée dans la base de données, et chaque migration s'exécute dans sa propre transaction. N'ajoutez des migrations qu'à la fin de la liste.

| Paramètre | Type | Description |
| --- | --- | --- |
| `migrations` | [`Migration`](#migration)`[]` | Toutes, depuis la première. |

**Renvoie** `{ from: number, to: number }` : La version avant et après.

**Lève** `SQLiteError` : Si une migration échoue. Elle est annulée ; les précédentes restent.

```js
db.migrate([
  "CREATE TABLE users (id INTEGER PRIMARY KEY, email TEXT NOT NULL UNIQUE)",
  "ALTER TABLE users ADD COLUMN name TEXT",
  (db) => db.update("users", { name: "unknown" }, { name: null }),
]);
```

## version

```ts
version: number
```

La version des migrations, stockée dans `PRAGMA user_version`.

## backup

```ts
backup(path: string): string
```

Copie la base de données dans un nouveau fichier. Sans risque pendant que l'application tourne.

| Paramètre | Type | Description |
| --- | --- | --- |
| `path` | `string` | Ne doit pas encore exister. |

**Renvoie** `string` : Le chemin absolu de la copie.

**Lève** `SQLiteError` : Si le fichier existe ou ne peut pas être écrit.

```js
db.backup(`backups/app-${nc.time.format(new Date(), "YYYY-MM-DD")}.sqlite`);
```

## vacuum

```ts
vacuum(): void
```

Compacte le fichier de la base de données pour récupérer l'espace inutilisé.

## fn

```ts
fn(name: string, implementation: (...args: any[]) => string | number | bigint | Uint8Array<ArrayBufferLike> | null, options?: { deterministic?: boolean; varargs?: boolean; } | undefined): SQLite<R>
```

Rend une fonction JavaScript appelable depuis SQL.

| Paramètre | Type | Description |
| --- | --- | --- |
| `name` | `string` |  |
| `implementation` | `(...args: any[]) => null \| number \| bigint \| string \| ``Uint8Array` |  |
| `options?` | `{ deterministic?: boolean, varargs?: boolean }` | `deterministic` (activé par défaut) permet aux index de l'utiliser ; `varargs` accepte un nombre quelconque d'arguments. |

```js
db.fn("slugify", (text) => nc.str.slugify(String(text)));
db.queryAll("SELECT slugify(title) AS slug FROM posts");
```

## path

```ts
path: string
```

Le chemin absolu du fichier de la base de données, ou `":memory:"`.

## isOpen

```ts
isOpen: boolean
```

Indique si la connexion est ouverte.

## native

```ts
native: DatabaseSync
```

La base de données `node:sqlite` sous-jacente, pour tout ce qui n'est pas couvert ici.

## close

```ts
close(): void
```

Ferme la connexion. L'appeler deux fois ne pose pas de problème.

## Types

Les types derrière les options et les résultats ci-dessus. En TypeScript, importez-les depuis le paquet : `import type { ChangeResult } from "@ix-xs/node-comfort"`.

### ChangeResult

Ce que renvoie une mise à jour ou une suppression.

| Propriété | Type | Description |
| --- | --- | --- |
| `ok` | `true` |  |
| `changes` | `number` |  |

### ColumnDefinition

Une colonne.

| Propriété | Type | Description |
| --- | --- | --- |
| `type` | [`ColumnType`](#columntype) | Comme `"INTEGER"`, `"TEXT"`, `"JSON"` ou `"VARCHAR(255)"`. |
| `primaryKey?` | `boolean` |  |
| `autoincrement?` | `boolean` | Avec une clé primaire `INTEGER` : les identifiants ne sont jamais réutilisés. |
| `notNull?` | `boolean` |  |
| `unique?` | `boolean` |  |
| `defaultValue?` | `unknown` | Les objets fonctionnent pour les colonnes JSON, les booléens pour les colonnes BOOLEAN. `"CURRENT_TIMESTAMP"`, `"CURRENT_DATE"` et `"CURRENT_TIME"` désignent le moment de l'insertion. |
| `defaultExpression?` | `string` | Une valeur par défaut calculée par SQLite, comme `"(unixepoch())"` ou `"(lower(hex(randomblob(16))))"`. Écrite telle quelle dans la table : ne la construisez jamais à partir d'une saisie utilisateur. |
| `values?` | `unknown[]` | Valeurs autorisées. |
| `check?` | `string` | Une expression `CHECK`, comme `"price >= 0"`. |
| `references?` | `{ table: string; column: string; }` | Cible de la clé étrangère. |
| `onDelete?` | [`ForeignKeyAction`](#foreignkeyaction) | Quand la ligne référencée est supprimée. |
| `onUpdate?` | [`ForeignKeyAction`](#foreignkeyaction) | Quand la clé référencée change. |

### ColumnInfo

Une colonne, telle que renvoyée par `columns()`.

| Propriété | Type | Description |
| --- | --- | --- |
| `name` | `string` |  |
| `type` | `string` | `""` quand il n'y en a pas. |
| `notNull` | `boolean` |  |
| `defaultValue` | `unknown` | Sous forme de texte SQL, ou `null`. |
| `primaryKey` | `boolean` |  |

### ColumnType

Un type de colonne. Les colonnes `JSON` et `BOOLEAN` vous rendent des objets et `true`/`false`.

```ts
type ColumnType = "INTEGER" | "TEXT" | "REAL" | "BLOB" | "NUMERIC" | "JSON" | "BOOLEAN" | "DATETIME" | (string & {})
```

### ForeignKeyAction

Ce qui arrive à une ligne quand la ligne qu'elle référence change.

```ts
type ForeignKeyAction = "CASCADE" | "SET NULL" | "SET DEFAULT" | "RESTRICT" | "NO ACTION"
```

### IndexDefinition

Un index.

| Propriété | Type | Description |
| --- | --- | --- |
| `columns` | `string[]` | Plusieurs colonnes forment un index composite. |
| `unique?` | `boolean` |  |
| `name?` | `string` | Par défaut : `idx_<table>_<columns>`. |
| `where?` | `string` | En fait un index partiel, comme `"deleted_at IS NULL"`. |

### InsertOptions

Options de `insert()` et `insertMany()`.

| Propriété | Type | Description |
| --- | --- | --- |
| `onConflict?` | `"replace" \| "ignore"` | Que faire quand une ligne entre en conflit avec une ligne existante : `"ignore"` la saute, `"replace"` supprime d'abord l'ancienne ligne. Par défaut, l'insertion échoue. |

### InsertResult

Ce que renvoie une insertion.

| Propriété | Type | Description |
| --- | --- | --- |
| `ok` | `true` |  |
| `changes` | `number` |  |
| `lastInsertRowid` | `number \| bigint` |  |

### Migration

Une migration : du SQL (plusieurs instructions sont possibles), ou une fonction qui reçoit la base de données.

```ts
type Migration = string | ((db: SQLite<any>) => void)
```

### PaginateOptions

Options de `paginate()`.

| Propriété | Type | Description |
| --- | --- | --- |
| `page?` | `number` | Commence à 1, qui est la valeur par défaut. |
| `perPage?` | `number` | Par défaut : `20`. |
| `orderBy?` | `string \| (string \| [string, `[`SortDirection`](#sortdirection)`])[]` | Donnez-en un : sans lui, SQLite est libre de renvoyer les lignes dans n'importe quel ordre. |
| `direction?` | [`SortDirection`](#sortdirection) |  |
| `columns?` | `string[]` |  |

### QueryOptions

Options de `getAll()`.

| Propriété | Type | Description |
| --- | --- | --- |
| `orderBy?` | `string \| (string \| [string, `[`SortDirection`](#sortdirection)`])[]` | Comme `"created_at"` ou `[["age", "DESC"], "name"]`. |
| `direction?` | [`SortDirection`](#sortdirection) | Pour une seule colonne `orderBy`. Par défaut : `"ASC"`. |
| `limit?` | `number` |  |
| `offset?` | `number` | Lignes à sauter, pour la pagination. |
| `columns?` | `string[]` | Colonnes à renvoyer. Par défaut : toutes. |

### SortDirection

Sens du tri.

```ts
type SortDirection = "ASC" | "DESC" | "asc" | "desc"
```

### SQLiteOptions

Options de `new SQLite()`.

| Propriété | Type | Description |
| --- | --- | --- |
| `json?` | `boolean` | Analyser les colonnes `JSON`. Par défaut : `true`. |
| `booleans?` | `boolean` | Renvoyer les colonnes `BOOLEAN` sous forme de `true`/`false`. Par défaut : `true`. |
| `dates?` | `boolean` | Renvoyer les colonnes `DATE`, `DATETIME` et `TIMESTAMP` sous forme de `Date`. Par défaut : `false`. |
| `wal?` | `boolean` | Journalisation write-ahead : plus rapide, et les lectures n'attendent pas les écritures. Par défaut : `true`. |
| `foreignKeys?` | `boolean` | Faire respecter les clés étrangères. Par défaut : `true`. |
| `busyTimeout?` | `string \| number` | Durée d'attente d'un verrou détenu par une autre connexion, en ms ou sous la forme `"5s"`. Par défaut : 5 secondes. |
| `synchronous?` | `"``OFF``" \| "``NORMAL``" \| "``FULL``" \| "``EXTRA``"` | Avec quelle insistance SQLite pousse chaque commit vers le disque. Avec `wal`, `"NORMAL"` écrit plusieurs fois plus vite et ne peut pas corrompre le fichier ; une coupure de courant peut annuler les derniers commits. Par défaut : le réglage de SQLite lui-même, `"FULL"`. |
| `readOnly?` | `boolean` |  |

### TableConstraint

Une contrainte sur plusieurs colonnes.

```ts
type TableConstraint = { type: "unique"; columns: string[]; } | { type: "primaryKey"; columns: string[]; } | { type: "check"; expression: string; } | { type: "foreignKey"; columns: string[]; references: { table: string; columns: string[]; }; onDelete?: ForeignKeyAction; onUpdate?: ForeignKeyAction; }
```

### TableDefinition

Une table pour `createTable()`.

| Propriété | Type | Description |
| --- | --- | --- |
| `name` | `string` |  |
| `columns?` | `Record``<string, `[`ColumnDefinition`](#columndefinition)`>` |  |
| `options?` | `Record``<string, `[`ColumnDefinition`](#columndefinition)`>` | Ancien nom de `columns`, toujours accepté. |
| `constraints?` | [`TableConstraint`](#tableconstraint)`[]` |  |
| `indexes?` | [`IndexDefinition`](#indexdefinition)`[]` |  |

### TableHandle

Des raccourcis liés à une table, créés par `table()`.

| Propriété | Type | Description |
| --- | --- | --- |
| `name` | `string` |  |
| `get` | `(where?: `[`Where`](#where)`<``R``>, options?: ``Pick``<`[`QueryOptions`](#queryoptions)`, "columns" \| "orderBy" \| "direction">) => ``R` | La première ligne correspondante. |
| `getAll` | `(where?: `[`Where`](#where)`<``R``>, options?: `[`QueryOptions`](#queryoptions)`) => ``R``[]` | Toutes les lignes correspondantes. |
| `paginate` | `(where?: `[`Where`](#where)`<``R``>, options?: `[`PaginateOptions`](#paginateoptions)`) => `[`Page`](/reference/arr/#page)`<``R``>` | Une page de lignes correspondantes. |
| `insert` | `(data: ``Partial``<``R``>, options?: `[`InsertOptions`](#insertoptions)`) => `[`InsertResult`](#insertresult) | Insère une ligne. |
| `insertMany` | `(rows: ``Iterable``<``Partial``<``R``>>, options?: `[`InsertOptions`](#insertoptions)`) => `[`ChangeResult`](#changeresult) | Insère des lignes en une seule transaction. |
| `update` | `(data: ``Partial``<``R``>, where: `[`Where`](#where)`<``R``>) => `[`ChangeResult`](#changeresult) | Met à jour les lignes correspondantes. |
| `increment` | `(amounts: ``Partial``<``Record``<keyof ``R`` & string, number>>, where: `[`Where`](#where)`<``R``>) => `[`ChangeResult`](#changeresult) | Ajoute aux colonnes numériques. |
| `upsert` | `(data: ``Partial``<``R``>, conflict: string[]) => `[`InsertResult`](#insertresult) | Insère, ou met à jour en cas de conflit. |
| `delete` | `(where: `[`Where`](#where)`<``R``>) => `[`ChangeResult`](#changeresult) | Supprime les lignes correspondantes. |
| `count` | `(where?: `[`Where`](#where)`<``R``>) => number` | Compte les lignes correspondantes. |
| `exists` | `(where?: `[`Where`](#where)`<``R``>) => boolean` | Au moins une ligne correspond-elle ? |
| `clear` | `() => { ok: true; }` | Supprime toutes les lignes. |

### TransactionOptions

Options de `transaction()`.

| Propriété | Type | Description |
| --- | --- | --- |
| `immediate?` | `boolean` | Prendre le verrou d'écriture tout de suite, plutôt qu'à la première écriture. Utilisez-le pour un travail de lecture puis d'écriture quand plusieurs processus partagent la base de données : ils s'attendent alors les uns les autres au lieu d'échouer avec `SQLITE_BUSY`. |

### Where

Un filtre. Chaque clé est une colonne : une valeur signifie « égal à », `null` signifie `IS NULL`, un tableau signifie « l'une de », et un objet utilise des opérateurs. Les clés se combinent avec AND ; utilisez `$or` et `$and` pour le reste.

Une clé avec des points regarde à l'intérieur d'une colonne JSON : `"settings.theme"` est la clé `theme` de la colonne `settings`, `"tags.0"` le premier élément de `tags`.

```ts
type Where = { [K in keyof R]?: WhereValue; } & { [path: `${string}.${string}`]: WhereValue; } & { $or?: Where<R>[]; $and?: Where<R>[]; }
```

### WhereOperators

Opérateurs pour une colonne dans un filtre.

| Propriété | Type | Description |
| --- | --- | --- |
| `eq?` | `unknown` | Égal. `null` signifie `IS NULL`. |
| `ne?` | `unknown` | Différent. Les lignes où la colonne vaut `NULL` correspondent aussi. |
| `gt?` | `string \| number \| bigint \| ``Date` | Supérieur à. |
| `gte?` | `string \| number \| bigint \| ``Date` | Supérieur ou égal. |
| `lt?` | `string \| number \| bigint \| ``Date` | Inférieur à. |
| `lte?` | `string \| number \| bigint \| ``Date` | Inférieur ou égal. |
| `in?` | `unknown[]` | L'une de ces valeurs. |
| `notIn?` | `unknown[]` | Aucune de ces valeurs. |
| `like?` | `string` | Un motif `LIKE` : `%` pour un texte quelconque, `_` pour un caractère. |
| `notLike?` | `string` |  |
| `glob?` | `string` | Un motif sensible à la casse : `*` pour un texte quelconque, `?` pour un caractère. |
| `between?` | `[unknown, unknown]` | De `min` à `max`, bornes comprises. |
| `isNull?` | `boolean` | `true` pour `IS NULL`, `false` pour `IS NOT NULL`. |

### WhereValue

La condition pour une colonne : une valeur, `null`, un tableau, ou des opérateurs.

```ts
type WhereValue = null | string | number | bigint | boolean | Date | Uint8Array | readonly unknown[] | WhereOperators
```
