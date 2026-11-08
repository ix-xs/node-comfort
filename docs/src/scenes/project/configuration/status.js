const nc = require("@ix-xs/node-comfort");
const { loadConfig } = require("./config");

async function main() {
  const config = loadConfig();
  nc.info("Configuration", config);
}

main().catch((error) => {
  nc.error(error.message);
  process.exitCode = 1;
});
