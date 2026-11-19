---
title: "Quota"
description: "`nc.quota` counts hits per key (a user, an IP, a guild) in a fixed window and says at once whether each one is allowed: 5 commands per user per minute, 100 requests per IP per hour."
---

```js
const { quota } = require("@ix-xs/node-comfort");
```

## Creating a quota

```js
const perUser = quota.create({ limit: 5, window: "1m" });

const { allowed, remaining, resetMs } = perUser.consume(userId);
if (!allowed) return reply(`Try again in ${Math.ceil(resetMs / 1000)}s`);
```

`quota.create(options)` is `new quota.Quota(options)`. The class is there to type a variable or to extend it.

| Option | | |
| --- | --- | --- |
| `limit` | Required | Hits each key may make per window. `0` refuses everything |
| `window` | Required | Length of a window, in ms or like `"1m"` |

A quota answers yes or no and never makes anyone wait. To space calls out, use [`async.rateLimit`](/flow/async/#limiters); to cap how many run at once, [`async.limit`](/flow/async/#limiters).

## consume

`consume(key, cost = 1)` records a hit and returns:

| Field | |
| --- | --- |
| `allowed` | Whether the hit fits in the quota |
| `remaining` | Hits left in the current window |
| `resetMs` | Milliseconds until the window ends |

```js
const perUser = quota.create({ limit: 3, window: "1m" });

perUser.consume("ada"); // { allowed: true, remaining: 2, resetMs: 60000 }
perUser.consume("ada"); // { allowed: true, remaining: 1, ... }
perUser.consume("ada"); // { allowed: true, remaining: 0, ... }
perUser.consume("ada"); // { allowed: false, remaining: 0, resetMs: 59998 }, a few ms later
perUser.consume("bob"); // { allowed: true, remaining: 2, resetMs: 60000 }
```

| Rule | |
| --- | --- |
| Keys | A string or a number. Each key has its own window |
| Window | Fixed: it starts at the key's first hit and lasts `window`. The next hit after it starts a new one |
| Refused hits | Not counted: a key that keeps trying gets in again as soon as its window ends |
| `cost` | What the hit uses up. A hit costing more than what remains is refused. `0` reads the state without using anything |

```js
const perAccount = quota.create({ limit: 100, window: "1h" });
perAccount.consume(accountId, rows.length); // a hit that costs one per row
```

## Keys and memory

| Member | |
| --- | --- |
| `reset(key)` | Forgets a key, whose next hit starts a new window. Returns whether it had one |
| `size` | Keys with a window, finished ones not dropped yet included |

Finished windows are dropped every 1000 hits, so keys that never come back (one-off visitors, deleted accounts) don't pile up. A quota holds no timer: nothing to stop or close.

```js
const logins = quota.create({ limit: 5, window: "15m" });

if (!logins.consume(ip).allowed) throw new Error("Too many attempts");
if (await checkPassword(user, password)) logins.reset(ip);
```

## Importing the class alone

The subpath exports the class, with a static `create`:

```js
const Quota = require("@ix-xs/node-comfort/quota");

const perIp = Quota.create({ limit: 100, window: "1h" });
```
