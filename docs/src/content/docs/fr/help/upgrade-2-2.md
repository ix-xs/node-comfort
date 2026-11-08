---
title: "Passer à la 2.2"
description: "La version 2.2 est une version de sécurité. La plupart des projets passent à la 2.2 sans rien changer. Cette page liste ce qui peut vous demander une action, le plus probable en premier."
sidebar:
  order: 6
---

La plupart des corrections de la 2.2 ne changent rien pour du code qui fonctionne aujourd'hui. Celles qui suivent refusent des entrées acceptées jusqu'ici, ou changent une valeur par défaut. Parcourez au moins les premières sections : ce sont celles que la plupart des projets rencontrent.

## Node.js 22.23.4, 24.22.1 ou 26.12.1

Le paquet exige désormais Node.js 22.23.4, 24.22.1, 26.12.1 ou une version plus récente de ces branches. Les versions plus anciennes peuvent être plantées par une seule réponse HTTP malveillante, et aucun paquet ne peut l'empêcher ([détails](/system/http/#servers-you-dont-control)). Node.js 25 n'est pas pris en charge.

Vérifiez avec `node --version`, puis mettez à jour le champ `engines` et la version de Node.js de votre CI et de vos images Docker. Node.js 26 est le choix le plus rapide : les fuseaux horaires y passent par `Temporal`.

## Des secrets JWT d'au moins 32 octets

Un secret `HS256`, `HS384` ou `HS512` de moins de 32 octets lève désormais une `TypeError`, à la signature comme à la vérification. Un secret comme `"secret"` ou `"my-app-key"` peut être deviné à partir d'un seul token.

Générez une fois pour toutes un nouveau secret et placez-le dans votre environnement :

```js
console.log(nc.crypto.generateKey()); // copiez le résultat dans JWT_SECRET
```

Les tokens signés avec l'ancien secret ne se vérifient pas avec le nouveau : vos utilisateurs devront donc se reconnecter. Pour vérifier la longueur au démarrage, ajoutez `JWT_SECRET: { type: "string", minLength: 32 }` à votre spec [`env.validate()`](/essentials/env/).

## env.parse() ne lit plus process.env

Une référence `${VAR}` dans le texte passé à `env.parse()` n'utilise plus que les variables du texte lui-même et celles de l'option `env`. Pour retrouver l'ancien comportement, passez l'environnement :

```js
nc.env.parse(text, { env: process.env });
```

`env.load()` et le chargement automatique du `.env` ne changent pas sur ce point.

## Certaines variables du .env automatique sont laissées de côté

Le `.env` chargé au démarrage ne définit plus les variables capables d'exécuter du code ou de désactiver les vérifications TLS : `NODE_OPTIONS`, `NODE_TLS_REJECT_UNAUTHORIZED`, `NODE_EXTRA_CA_CERTS`, `PATH`, `GIT_SSH_COMMAND` et d'autres du même genre. Un avertissement sur stderr nomme celles qu'il a laissées de côté.

Si votre propre `.env` définit volontairement l'une d'elles, chargez-le explicitement, ce qui définit tout :

```js
nc.env.load(".env");
```

Ou définissez ces variables dans l'environnement réel. La [page sur le `.env`](/essentials/env/) donne les détails.

## http : les chemins restent sous baseURL

Avec une `baseURL`, une URL qui en sort (`"../admin"`, `"//other.host"`, `"https://other.host/"`) lève désormais une `TypeError` : un chemin construit à partir d'une donnée extérieure ne peut donc pas emporter l'en-tête `auth` du client ailleurs. Si l'un de vos clients appelle volontairement des URL absolues, passez `allowAbsoluteUrls: true` :

```js
await api.get(asset.url, { allowAbsoluteUrls: true });
```

Les `auth`, `headers` et `query` du client restent alors avec l'origine de base, et seul ce que l'appel fournit part avec la requête. Une valeur `.` ou `..` dans `params` lève aussi une erreur.

## Les écritures SQLite refusent les filtres qui atteignent toutes les lignes

`update()`, `delete()`, `increment()` et `set()` lèvent désormais une `SQLiteError` pour une valeur de filtre `undefined`, un `$and` ou un `$or` vide, ou un filtre qui correspond à toutes les lignes, comme `{ id: { notIn: [] } }`. Avant, `{ id: undefined }` était ignoré et l'écriture modifiait toute la table.

Si une erreur apparaît là, une valeur manquait : vérifiez d'où elle vient. Pour vider une table volontairement, utilisez `clearTable()` :

```js
db.clearTable("sessions");
```

Si vos filtres prennent des valeurs dans le corps d'une requête, regardez aussi [`operators: "tagged"`](/system/sqlite/#values-from-a-request).

## Des secrets TOTP d'au moins 10 octets

`totp()` et `verifyTOTP()` lèvent une `TypeError` pour un secret de moins de 10 octets (16 caractères Base32) : les secrets de 80 bits que créent beaucoup d'applications fonctionnent donc toujours. `totpSecret()` crée maintenant des secrets d'au moins 16 octets (20 par défaut). `window` doit être un entier de 0 à 10.

Un utilisateur dont le secret fait moins de 10 octets doit configurer à nouveau l'authentification à deux facteurs, avec un nouveau secret.

## sys.open() n'ouvre que les liens web et mail

`sys.open()` lève désormais une `TypeError` pour un schéma autre que `http:`, `https:` et `mailto:`, et une `Error` pour un chemin qui n'existe pas. Sous Windows, les chemins réseau (`\\server\share`) sont refusés. Nommez les autres schémas dont vous avez besoin :

```js
nc.sys.open("vscode://file/C:/app/index.js", { protocols: ["vscode:"] });
nc.sys.open("\\\\nas\\reports\\today.pdf", { allowUNC: true });
```

## sys.run() sous Windows et avec extendEnv

- Sous Windows, un argument contenant un saut de ligne passé à un fichier `.cmd` ou `.bat` (comme `npm`) entraîne un rejet avec une `ProcessError` : on ne peut pas le transmettre à `cmd.exe` sans risque. Passez plutôt ce texte par `input` ou par un fichier.
- Une commande relative, comme `"./bin/tool"`, est cherchée depuis `options.cwd`, et non depuis le dossier courant.
- `extendEnv: false` sans `env` donne à la commande un environnement vide. Passez ce dont elle a besoin dans `env`.

## http : taille des réponses et redirections

- Un corps de plus de 100 Mo, une fois décompressé, lève une `HttpError` avec le code `ERR_RESPONSE_TOO_LARGE`. Relevez la limite avec `maxResponseSize: "1GB"`, ou utilisez `responseType: "stream"` ou `download()` pour les gros fichiers.
- Le client suit lui-même les redirections. Lors d'une redirection vers une autre origine, il retire `authorization`, `cookie` et les en-têtes de `sensitiveHeaders` (`x-api-key`, `x-auth-token` et `api-key` par défaut). Si vous envoyez un secret sous un autre nom d'en-tête, listez-le dans `sensitiveHeaders`.
- `redirect: "error"` lève une `HttpError` avec le code `ERR_REDIRECT`, qui n'est pas relancée.

## Journaux

- Les caractères de contrôle des valeurs journalisées s'affichent sous forme de texte (`\x1b`, `\r`), et les lignes qui suivent la première sont indentées, même sans horodatage (sauf pour `log()` sans scope ni horodatage, qui affiche comme `console.log`). Si un outil analyse vos journaux lisibles, vérifiez qu'il les lit toujours. Pour les outils, les journaux JSON restent le meilleur choix.
- Le balisage (`<% red ...%>`) n'est lu que dans le premier argument. Déplacez dans le premier le balisage que vous placiez dans un argument suivant.
- Sans couleurs, et dans les fichiers de journal, les couleurs sont retirées des chaînes journalisées.
- En JSON, un objet journalisé ne peut pas remplacer `time`, `level`, `scope` ou `msg`.
- Les nouveaux fichiers de journal ne sont lisibles que par leur propriétaire. Passez `mode: 0o640` dans `file` si un autre utilisateur doit les lire.

## Changements mineurs

- **`crypto.safeEqual("", "")` vaut `false`.** Une valeur vide n'est jamais égale à rien, comme une valeur absente.
- **`str.mask()` masque tout** quand `start` et `end` laisseraient voir tout le texte : `str.mask("1234")` vaut `"****"`.
- **`color.strip()` retire aussi `\r`, `\b`** et tous les autres caractères de contrôle, sauf les tabulations et les sauts de ligne.
- **`isURL()` et `schema.string().url()` refusent les espaces, les guillemets doubles, `<`, `>`, les accents graves et les barres obliques inverses.** Une apostrophe ne pose pas de problème. `isEmail()`, `isHostname()`, `isMimeType()` et `isCron()` sont plus stricts sur les caractères qui se ressemblent, la longueur des labels, les sauts de ligne et le texte en trop à la fin, et `time.cron()` refuse `"*/5/x"`.
- **`func.memoize()`, `func.dedupe()` et `cache.wrap()` comparent les `Set`, les `Map` et les instances de classes par identité.** Deux `Set` différents avec les mêmes éléments font deux appels.
- **`obj.set()` et `obj.unflatten()` créent un objet pour une clé numérique au-delà de 10000 :** `obj.set({}, "a.20000", 1)` donne `{ a: { "20000": 1 } }`, et non un tableau de 20001 éléments.
- **`arr.pluck()` et les autres itérateurs par chaîne ignorent ce qu'un élément hérite de `Object.prototype`,** et `obj.get({}, "toString")` vaut `undefined`.
- **`fs.copyFile()`, `moveFile()`, `copy()`, `move()` et les fonctions de dossiers renvoient `false` (ou `0`)** quand la destination est la source ou se trouve à l'intérieur. Avant, elles supprimaient les données.
- **`schema.union()` arrête de vérifier une option à son premier problème, et `is()` s'arrête au premier problème :** les raffinements qui suivent ne s'exécutent plus.
- **`crypto.verifyPassword()` lève une `RangeError` pour un hash dont les réglages prendraient des minutes à vérifier** (scrypt avec `p` au-delà de 16, Argon2 avec plus de 1 Gio), sans faire ce travail. Le mot de passe peut très bien être bon : hashez-le à nouveau avec des réglages dans les limites.
- **Avec `operators: "tagged"`, les lectures SQLite lèvent aussi une erreur pour une valeur de filtre `undefined`,** pour qu'un champ absent d'une requête ne puisse pas faire disparaître sa condition.

## Ce que vous pouvez utiliser maintenant

Rien d'obligatoire, mais cela vaut le coup d'œil une fois passé à la 2.2 :

- [Les mots de passe Argon2id](/system/crypto/#passwords) avec Node.js 24.7 ou plus récent, et `needsRehash()` pour faire passer les utilisateurs une connexion à la fois.
- [`totpStep()` et `after`](/system/crypto/#two-factor-authentication) pour refuser un code à deux facteurs déjà utilisé.
- [`SQLite.op` et `operators: "tagged"`](/system/sqlite/#values-from-a-request) pour les filtres construits à partir de valeurs d'une requête.
- [`maxDepth`](/data/schema/#recursive-data) pour les schémas qui lisent des entrées profondément imbriquées.
- [`using`](/recipes/#cleaning-up-with-using) avec les watchers, les planifications, les spinners et les écouteurs, sur Node.js 24 ou plus récent.

Le [journal des modifications](https://github.com/ix-xs/node-comfort/blob/main/CHANGELOG.md) contient la liste complète.
