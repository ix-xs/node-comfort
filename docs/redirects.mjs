// Where the pages of the previous structure went. Every old address keeps
// working: the build writes a redirect for each entry, in every language.
export const MOVED = {
  // The guide rebuilt as one path (November 2026): the landing page and the
  // introduction became the opening of the guide, and "Getting started" the
  // installation; the pages about versions went to Help, the recipes got a
  // page each.
  "/start/introduction/": "/",
  "/start/getting-started/": "/start/installation/",
  "/start/upgrade-2-2/": "/help/upgrade-2-2/",
  "/start/migration/": "/help/migration/",
  "/start/performance/": "/help/performance/",
  "/recipes/": "/recipes/api-server/",
};
