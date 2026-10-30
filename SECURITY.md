# Security policy

## Supported versions

| Version | Supported |
| --- | --- |
| 2.x | ✅ |
| 1.x | ❌ (please upgrade: 1.2.0 is affected by a prototype pollution issue in `obj.set` and `obj.unflatten`) |

## Keep Node.js up to date

`nc.http` uses the `fetch()` built into Node.js. A flaw in it is a flaw in your program, and no package can
fix it for you. Versions before 22.23.4, 24.22.1 and 26.12.1 can be crashed by a single malicious HTTP
response (GHSA-xjj6-f33q-929c). If your program calls servers you don't control, use one of these versions
or a later one.

## Reporting a vulnerability

Please **do not open a public issue** for security problems. Report them privately through
[GitHub Security Advisories](https://github.com/ix-xs/node-comfort/security/advisories/new).

Include a description of the issue, the affected version and, if possible, a minimal reproduction.
You will get an answer as soon as possible, and a fix will be released with credit to you (unless you
prefer to stay anonymous).
