const { schema: s, cli } = require("@ix-xs/node-comfort");

const User = s.object({
  name: s.string().trim().min(2),
  email: s.string().email().toLowerCase(),
  age: s.number().int().min(18).optional(),
  role: s.enum(["admin", "user"]).default("user"),
});

const result = User.safeParse({ name: " A ", email: "nope", age: 12, role: "root" });

console.log(result.success ? result.data : cli.table(
  result.issues.map((issue) => ({ where: issue.path.join("."), code: issue.code, message: issue.message })),
));
