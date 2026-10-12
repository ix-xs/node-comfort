const { schema: s } = require("@ix-xs/node-comfort");

const User = s.object({
  name: s.string().min(2).describe("Display name"),
  email: s.string().email(),
  age: s.number().int().min(18).optional(),
  role: s.enum(["admin", "user"]).default("user"),
});

// For an OpenAPI document, a form, or a tool you give to a language model.
console.log(JSON.stringify(User.toJSONSchema(), null, 2));
