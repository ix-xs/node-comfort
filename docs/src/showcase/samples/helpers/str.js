const { str } = require("@ix-xs/node-comfort");

console.log(str.slugify("Crème brûlée, façon Wörld!"));
console.log(str.truncate("A family: 👨‍👩‍👧 stays whole", 13));
console.log(str.plural(3, { one: "file", other: "files" }));
console.log(str.humanize("user_firstName"));
console.log(str.closest("instal", ["install", "uninstall", "init"]));
console.log(str.mask("4242424242424242", { visible: 4 }));
console.log(str.template("Hello {user.name}!", { user: { name: "Ada" } }));
