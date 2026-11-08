// Data for the dev-only page src/pages/dev/[state].astro: the scenes the guide
// shows, the worst realistic terminal output, and the smallest one. Real
// scenes come from src/scenes/output.json; the others are written here, as a
// program could print them, to see what breaks at 320 px.

type Unit = { html: string; wait?: boolean };
export type Fixture = { scenes: string[]; terminal: { command: string; units: Unit[] }[] };

const escape = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
/** Plain lines, printed in one write. */
const unit = (lines: string[], wait = false): Unit => ({ html: lines.map((line) => `<span class="nc-line">${escape(line) || " "}</span>`).join(""), ...(wait ? { wait } : {}) });

export const demo: Fixture = {
  scenes: ["project/storage/second", "project/command-line/table", "project/production/watch"],
  terminal: [],
};

const url = "https://api.example.com/v1/organizations/4f9c2d1e-7b3a-4c8e-9d2f-0a1b2c3d4e5f/projects/status-monitoring-for-every-region/checks?include=history,alerts,owners&since=2026-01-01T00:00:00.000Z";
const word = "Supercalifragilisticexpialidocious".repeat(4);

export const worst: Fixture = {
  scenes: ["project/command-line/json"],
  terminal: [
    {
      command: `SITES_FILE=config/production/sites-of-every-customer-in-every-region.json CHECK_EVERY=30s node status.js --watch --every 30s --site "Customer portal (Europe, Frankfurt and Paris)" --json`,
      units: [
        unit([`[09:30:00] ℹ INFO Checking 1 site every 30s`]),
        unit([`[09:30:01] ✖ ERROR Customer portal (Europe, Frankfurt and Paris) is down: Request failed with status 503 Service Unavailable: GET ${url}`], true),
        unit([`[09:30:01] ⚠ WARN ${word}`]),
        unit([
          "╭──────────────────────────────────────────────┬───────┬────────┬────────────────────────────╮",
          "│ site                                         │ state │ status │ uptime                     │",
          "├──────────────────────────────────────────────┼───────┼────────┼────────────────────────────┤",
          "│ Customer portal (Europe, Frankfurt and Paris)│ down  │    503 │ 99.95% of 1,284,512 checks │",
          "╰──────────────────────────────────────────────┴───────┴────────┴────────────────────────────╯",
        ]),
        unit(["顧客ポータル（東京）は稼働中です。応答時間は 120 ミリ秒、過去 30 日間の稼働率は 99.99% でした。", "🟢 up  🔴 down  ⚪ unknown"]),
        ...Array.from({ length: 40 }, (_, i) => unit([`[09:30:${String(2 + (i % 58)).padStart(2, "0")}] ℹ INFO Line ${i + 1} of 40`])),
      ],
    },
  ],
};

export const one: Fixture = {
  scenes: [],
  terminal: [
    { command: "node status.js", units: [] },
    { command: "node --version", units: [unit(["v26.13.0"])] },
    { command: "x", units: [unit([""])] },
  ],
};
