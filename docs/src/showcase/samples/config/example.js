const { env } = require("@ix-xs/node-comfort");

// The .env.example that goes with your checks, so they never drift apart.
console.log(env.example({
  PORT: { type: "port", default: 3000, description: "Port to listen on" },
  DATABASE_URL: { type: "url", description: "Postgres connection string" },
  LOG_LEVEL: { type: "enum", values: ["debug", "info", "warn"], default: "info" },
  SENTRY_DSN: { type: "url", optional: true },
}));
