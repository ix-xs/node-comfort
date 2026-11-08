const nc = require("@ix-xs/node-comfort");
const { loadConfig } = require("./config");
const { loadSites } = require("./sites");
const { checkAll } = require("./check");
const { openStore } = require("./store");

const { flags } = nc.cli.args({
  site: { type: "string", short: "s", description: "Check only the site with this name" },
  json: { type: "boolean", description: "Print the results as JSON" },
}, { name: "status", description: "Checks that your sites answer.", version: "1.0.0" });

async function main() {
  const config = loadConfig();
  const sites = loadSites(config.SITES_FILE).filter((site) => !flags.site || site.name === flags.site);
  if (sites.length === 0) throw new Error(`No site is named "${flags.site}"`);
  const store = openStore(config.DATABASE_PATH);

  const results = await nc.cli.spin(`Checking ${nc.str.plural(sites.length, { one: "site", other: "sites" })}`, checkAll(sites, config), {
    success: (done) => `${done.filter((result) => result.up).length} of ${done.length} up`,
  });
  store.save(results);
  const rows = results.map((result) => ({
    site: result.name,
    state: result.up ? "up" : "down",
    status: result.status,
    uptime: store.uptime(result.name),
  }));
  store.close();

  if (flags.json) {
    console.log(JSON.stringify(rows, null, 2));
    return;
  }
  nc.table(rows, {
    columns: ["site", { key: "state", format: (state) => (state === "up" ? nc.color.green(state) : nc.color.red(state)) }, "status", "uptime"],
  });
}

main().catch((error) => {
  nc.error(error.message);
  process.exitCode = 1;
});
