const { crypto } = require("@ix-xs/node-comfort");

async function main() {
  // The auth service signs with the private key; everyone else verifies with the public one.
  const { publicKey, privateKey } = await crypto.generateKeyPair("ES256");

  const token = crypto.signJWT({ sub: "42", role: "admin" }, privateKey, { expiresIn: "15m" });
  console.log(token.slice(0, 64) + "...");
  console.log(crypto.verifyJWT(token, publicKey));

  try {
    crypto.verifyJWT(token.slice(0, -4) + "AAAA", publicKey);
  } catch (error) {
    console.log(error.name, error.code);
  }
}
main();
