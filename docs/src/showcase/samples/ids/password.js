const { crypto } = require("@ix-xs/node-comfort");

async function main() {
  const stored = await crypto.hashPassword("correct horse battery staple");
  console.log(stored);
  console.log(await crypto.verifyPassword("correct horse battery staple", stored));
  console.log(await crypto.verifyPassword("hunter2", stored));

  const box = crypto.encrypt("4242 4242 4242 4242", crypto.generateKey());
  console.log(box.slice(0, 60) + "...");
}
main();
