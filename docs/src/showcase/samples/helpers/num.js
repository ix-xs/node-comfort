const { num } = require("@ix-xs/node-comfort");

console.log(num.round(1.005, 2), "is not", (1.005).toFixed(2));
console.log(num.formatBytes(1_536_000));
console.log(num.currency(1234.5, "EUR", { locale: "fr-FR" }));
console.log(num.abbreviate(1_250_000));
console.log(num.ordinal(22), num.ordinal(3, { locale: "fr" }));
console.log(num.sum([0.1, 0.2, 0.3]), "is not", 0.1 + 0.2 + 0.3);
console.log(num.percentChange(80, 100) + " %");
