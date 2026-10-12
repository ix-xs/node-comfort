const nc = require("@ix-xs/node-comfort");

const log = nc.createLogger({
  scope: "auth",
  redact: ["password", "authorization"],
});

log.info("Login", {
  email: "ada@example.com",
  password: "hunter2",
  headers: { authorization: "Bearer eyJhbGciOi...", accept: "*/*" },
});
