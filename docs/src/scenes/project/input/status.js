const nc = require("@ix-xs/node-comfort");
const { loadConfig } = require("./config");
const { loadSites } = require("./sites");

async function main() {
  const config = loadConfig();
  const sites = loadSites(config.SITES_FILE);
  nc.info(`${sites.length} sites to check: ${sites.map((site) => site.name).join(", ")}`);
}

main().catch((error) => {
  nc.error(error.message);
  process.exitCode = 1;
});
