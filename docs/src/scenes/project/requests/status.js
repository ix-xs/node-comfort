const nc = require("@ix-xs/node-comfort");
const { loadConfig } = require("./config");
const { loadSites } = require("./sites");
const { checkAll } = require("./check");

async function main() {
  const config = loadConfig();
  const sites = loadSites(config.SITES_FILE);
  nc.info(`Checking ${sites.length} sites`);

  const results = await checkAll(sites, config);
  for (const result of results) {
    if (!result.up) nc.error(`${result.name} is down: ${result.error}`);
    else if (result.attempts > 1) nc.warn(`${result.name} is up, after ${result.attempts} attempts`);
    else nc.success(`${result.name} is up`);
  }
}

main().catch((error) => {
  nc.error(error.message);
  process.exitCode = 1;
});
