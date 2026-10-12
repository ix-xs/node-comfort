const { env } = require("@ix-xs/node-comfort");

const spec = {
  PORT: { type: "port", default: 3000 },
  DATABASE_URL: { type: "url", protocols: ["postgres"], description: "Postgres connection string" },
  JWT_SECRET: { type: "string", minLength: 32 },
  CACHE_TTL: { type: "duration", default: "5m" },
};

try {
  env.validate(spec, { env: { JWT_SECRET: "too short" } });
} catch (error) {
  console.log(error.message);
}

const ok = { DATABASE_URL: "postgres://localhost/app", JWT_SECRET: "x".repeat(32) };
console.log(env.validate(spec, { env: ok }));
