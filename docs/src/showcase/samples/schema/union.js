const { schema: s } = require("@ix-xs/node-comfort");

const Event = s.discriminatedUnion("type", [
  s.object({ type: s.literal("click"), x: s.number(), y: s.number() }),
  s.object({ type: s.literal("key"), key: s.string() }),
]);

console.log(Event.parse({ type: "key", key: "Enter", extra: true }));

try {
  Event.parse({ type: "click", x: 10 });
} catch (error) {
  console.log(error.message);
}
