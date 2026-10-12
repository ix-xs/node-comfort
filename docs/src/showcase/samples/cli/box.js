const { cli, color } = require("@ix-xs/node-comfort");

const lines = [
  `${color.green("✔")} Ready in 340 ms`,
  "",
  `Local    ${color.cyan("http://localhost:3000")}`,
  `Network  ${color.cyan("http://192.168.1.20:3000")}`,
];

console.log(cli.box(lines.join("\n"), { title: "my-app", borderColor: "green", padding: { x: 3, y: 1 } }));
