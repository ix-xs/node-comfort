const { cli } = require("@ix-xs/node-comfort");

const servers = [
  { name: "api-1", region: "Paris", cpu: 0.42, tags: "blue\nstable" },
  { name: "api-2", region: "Tokyo", cpu: 0.87, tags: "green" },
  { name: "worker", region: "Oregon", cpu: 0.05, tags: "" },
];

console.log(cli.table(servers, {
  columns: ["name", "region", { key: "cpu", header: "CPU", format: (n) => `${Math.round(n * 100)} %` }, "tags"],
}));
