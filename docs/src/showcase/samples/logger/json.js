const nc = require("@ix-xs/node-comfort");

// One object per line, for a log collector. LOG_FORMAT=json does the same.
const log = nc.createLogger({ format: "json", fields: { service: "billing" } });

log.info("Invoice sent", { invoice: "inv_8421", total: 129.9 });
log.warn("Retrying", { attempt: 2 });
log.child("stripe").error("Card declined", { code: "card_declined" });
