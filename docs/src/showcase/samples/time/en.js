const { time } = require("@ix-xs/node-comfort");

time.setTimezone("Europe/Paris");
const launch = new Date("2026-03-14T09:30:00Z");

console.log(time.format(launch, "dddd D MMMM YYYY, HH:mm z"));
console.log(time.relative(launch, new Date("2026-03-16T12:00:00Z")));
console.log(time.formatDuration("1h 30m 12s", { long: true }));
console.log(time.range(launch, time.add(launch, 2, "month"), "month").map((d) => time.format(d, "D MMM")));
console.log(time.nextRun("0 9 L * *", { from: launch }).toISOString());
