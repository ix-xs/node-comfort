const nc = require("@ix-xs/node-comfort");

function openStore(file) {
  const db = new nc.SQLite(file);
  db.createTable({
    name: "checks",
    columns: {
      id: { type: "INTEGER", primaryKey: true, autoincrement: true },
      site: { type: "TEXT", notNull: true },
      up: { type: "BOOLEAN", notNull: true },
      status: { type: "INTEGER", notNull: true },
      checked_at: { type: "DATETIME", notNull: true },
    },
    indexes: [{ columns: ["site"] }],
  });

  return {
    save(results) {
      const now = new Date();
      db.insertMany("checks", results.map((result) => ({
        site: result.name,
        up: result.up,
        status: result.status,
        checked_at: now,
      })));
    },
    uptime(site) {
      const total = db.count("checks", { site });
      const up = db.count("checks", { site, up: true });
      return `${nc.num.percent(up, total, 0)}% of ${nc.str.plural(total, { one: "check", other: "checks" })}`;
    },
    close: () => db.close(),
  };
}

module.exports = { openStore };
