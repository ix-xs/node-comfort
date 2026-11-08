const nc = require("@ix-xs/node-comfort");
const { schema: s } = nc;

const Sites = s.array(
  s.object({
    name: s.string().trim().min(1),
    url: s.string().url(),
  }),
).min(1);

function loadSites(file) {
  const data = nc.readJSON(file);
  if (data === undefined) throw new Error(`${file} is missing or is not JSON`);
  const result = Sites.safeParse(data);
  if (!result.success) throw new Error(`${file}: ${result.error.message}`);
  return result.data;
}

module.exports = { loadSites };
