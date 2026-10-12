const { cli, color } = require("@ix-xs/node-comfort");

console.log(cli.tree({
  src: {
    "index.js": "1.2 kB",
    routes: ["users.js", "orders.js"],
    db: { "schema.sql": null, migrations: ["001_init.sql", "002_orders.sql"] },
  },
  "package.json": color.green("valid"),
}));
