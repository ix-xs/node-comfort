const nc = require("@ix-xs/node-comfort");

nc.info("Server listening on port", 3000);
nc.success("Database connected");
nc.warn("Cache is <% bold almost%> full");
nc.error("Payment refused:", "card_declined");

const db = nc.createLogger({ scope: "db", level: "debug" });
db.debug("SELECT * FROM users WHERE id = 42");
db.info("12 migrations applied");
nc.log("<% cyan bold Tip:%> press <% bgWhite black  q %> to quit");
