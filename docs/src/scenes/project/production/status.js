const nc = require("@ix-xs/node-comfort");
const { loadConfig } = require("./config");
const { loadSites } = require("./sites");
const { checkAll } = require("./check");
const { openStore } = require("./store");

const { flags } = nc.cli.args({
  site: { type: "string", short: "s", description: "Check only the site with this name" },
  json: { type: "boolean", description: "Print the results as JSON" },
  watch: { type: "boolean", short: "w", description: "Check again and again, until stopped" },
  every: { type: "string", default: "5m", env: "CHECK_EVERY", description: "How long --watch waits between two checks" },
}, { name: "status", description: "Checks that your sites answer.", version: "1.0.0" });

async function checkOnce(sites, config, store) {
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

function watch(sites, config, store) {
  const every = nc.time.parseDuration(flags.every);
  if (!every) throw new Error(`--every: "${flags.every}" is not a duration`);
  nc.configure({ file: { path: "logs/status.log", maxSize: "10MB", maxFiles: 5 } });
  nc.info(`Checking ${nc.str.plural(sites.length, { one: "site", other: "sites" })} every ${nc.time.formatDuration(every)}`);

  const job = nc.time.every(every, async () => {
    const results = await checkAll(sites, config);
    store.save(results);
    const down = results.filter((result) => !result.up);
    for (const result of down) nc.error(`${result.name} is down: ${result.error}`);
    nc.info(`${results.length - down.length} of ${results.length} up`);
  }, { immediate: true, onError: (error) => nc.error(error) });

  nc.sys.onShutdown(() => {
    job.stop();
    store.close();
    nc.info("Stopped");
  });
}

async function main() {
  const config = loadConfig();
  const sites = loadSites(config.SITES_FILE).filter((site) => !flags.site || site.name === flags.site);
  if (sites.length === 0) throw new Error(`No site is named "${flags.site}"`);
  const store = openStore(config.DATABASE_PATH);

  if (flags.watch) watch(sites, config, store);
  else await checkOnce(sites, config, store);
}

main().catch((error) => {
  nc.error(error.message);
  process.exitCode = 1;
});
