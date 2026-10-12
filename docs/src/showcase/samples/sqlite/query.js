const { SQLite, cli } = require("@ix-xs/node-comfort");

const db = new SQLite(":memory:");
db.createTable({
  name: "users",
  columns: {
    id: { type: "INTEGER", primaryKey: true },
    email: { type: "TEXT", unique: true },
    active: { type: "BOOLEAN", defaultValue: true },
    settings: { type: "JSON", defaultValue: {} },
  },
});
db.insertMany("users", [
  { email: "ada@example.com", settings: { theme: "dark", beta: true } },
  { email: "bob@example.com", settings: { theme: "light" } },
  { email: "cy@example.com", active: false, settings: { theme: "dark" } },
]);

// Filter on a key inside the JSON column, and get objects and booleans back.
console.log(cli.table(db.getAll("users", { "settings.theme": "dark" })));
