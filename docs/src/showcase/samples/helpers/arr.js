const { arr } = require("@ix-xs/node-comfort");

const orders = [
  { id: 1, customer: "ada", total: 40, status: "paid" },
  { id: 2, customer: "bob", total: 15, status: "open" },
  { id: 3, customer: "ada", total: 25, status: "paid" },
];

console.log(arr.groupBy(orders, "customer"));
console.log(arr.sortBy(orders, ["status", { key: "total", order: "desc" }]).map((o) => o.id));
console.log(arr.sumBy(orders, "total"), arr.toSentence(arr.unique(arr.pluck(orders, "customer"))));
