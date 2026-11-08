const nc = require("@ix-xs/node-comfort");
const { loadConfig } = require("./config");
const { loadSites } = require("./sites");
const { checkAll } = require("./check");
const { openStore } = require("./store");

async function main() {
  const config = loadConfig();
  const sites = loadSites(config.SITES_FILE);
  const store = openStore(config.DATABASE_PATH);
  nc.info(`Checking ${sites.length} sites`);

  const results = await checkAll(sites, config);
  store.save(results);
  for (const result of results) {
    const uptime = store.uptime(result.name);
    if (result.up) nc.success(`${result.name} is up (${uptime})`);
    else nc.error(`${result.name} is down (${uptime}): ${result.error}`);
  }
  store.close();
}

main().catch((error) => {
  nc.error(error.message);
  process.exitCode = 1;
});
