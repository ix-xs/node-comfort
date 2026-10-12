const { SQLite } = require("@ix-xs/node-comfort");

const db = new SQLite(":memory:");
db.createTable({ name: "posts", columns: { id: { type: "INTEGER", primaryKey: true }, title: { type: "TEXT" }, views: { type: "INTEGER", defaultValue: 0 } } });
db.insertMany("posts", Array.from({ length: 23 }, (_, i) => ({ title: `Post ${i + 1}` })));

// Two requests at the same moment both count.
db.increment("posts", { views: 1 }, { id: 21 });

const page = db.paginate("posts", {}, { page: 3, perPage: 10, orderBy: "id" });
console.log(page);
