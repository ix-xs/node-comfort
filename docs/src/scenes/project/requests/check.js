const nc = require("@ix-xs/node-comfort");

async function checkSite(site, config) {
  try {
    const response = await nc.http.get(site.url, {
      timeout: config.TIMEOUT,
      retry: { attempts: 3, delay: "300ms" },
      responseType: "text",
    });
    return { name: site.name, up: true, status: response.status, attempts: response.attempts };
  } catch (error) {
    return { name: site.name, up: false, status: error.status ?? 0, error: error.message };
  }
}

function checkAll(sites, config) {
  return nc.async.map(sites, (site) => checkSite(site, config), { concurrency: config.CONCURRENCY });
}

module.exports = { checkAll };
