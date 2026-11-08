const nc = require("@ix-xs/node-comfort");

nc.info("Hello from node-comfort");
nc.success(nc.str.slugify("Héllo Wörld, from node-comfort!"));
nc.box(nc.time.format(new Date(), "dddd D MMMM YYYY"), { title: "today" });
