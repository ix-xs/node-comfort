---
title: "Tous les exports"
description: "Tout ce que contient @ix-xs/node-comfort 2.1.1 : 23 espaces de noms et classes, 573 fonctions et méthodes, avec pour chacune une ligne qui dit ce qu'elle fait."
sidebar:
  label: "Tous les exports"
  order: 0
---

Cette page est écrite à partir du code source, comme la documentation que votre éditeur affiche au survol. Cherchez-y avec votre navigateur pour savoir si quelque chose existe, puis suivez le lien pour le détail.

## Essentiels

### nc.logger

Un logger pour la console qui fonctionne sans aucune configuration : niveaux, couleurs, un petit balisage pour le style, groupes, chronomètres et tableaux. [Référence](/reference/logger/) • [Guide](/essentials/logger/)

| Nom | Rôle |
| --- | --- |
| [`log()`](/reference/logger/#log) | Affiche un message sans badge. |
| [`trace()`](/reference/logger/#trace) | Diagnostic très détaillé, affiché uniquement au niveau `trace`. |
| [`debug()`](/reference/logger/#debug) | Diagnostic pour les développeurs, affiché au niveau `debug` (le niveau par défaut quand `DEBUG` est défini). |
| [`info()`](/reference/logger/#info) | Un message d'information. |
| [`success()`](/reference/logger/#success) | Un message de succès. |
| [`warn()`](/reference/logger/#warn) | Un avertissement, écrit sur stderr. |
| [`error()`](/reference/logger/#error) | Une erreur, écrite sur stderr. |
| [`fatal()`](/reference/logger/#fatal) | Une erreur fatale, écrite sur stderr. |
| [`group()`](/reference/logger/#group) | Affiche un libellé et indente ce qui suit, jusqu'à `groupEnd()`. |
| [`groupEnd()`](/reference/logger/#groupend) | Ferme le groupe en cours. |
| [`timeStart()`](/reference/logger/#timestart) | Démarre un chronomètre nommé. |
| [`timeEnd()`](/reference/logger/#timeend) | Affiche le temps écoulé depuis `timeStart()` avec le même libellé. |
| [`table()`](/reference/logger/#table) | Affiche des lignes sous forme de tableau. |
| [`box()`](/reference/logger/#box) | Affiche du texte dans un cadre. |
| [`divider()`](/reference/logger/#divider) | Affiche une ligne horizontale, avec un titre facultatif à l'intérieur. |
| [`setLevel()`](/reference/logger/#setlevel) | Définit le niveau minimal. |
| [`getLevel()`](/reference/logger/#getlevel) | Le niveau minimal actuel. |
| [`isLevelEnabled()`](/reference/logger/#islevelenabled) | Ce niveau serait-il affiché ? |
| [`configure()`](/reference/logger/#configure) | Modifie plusieurs réglages à la fois. |
| [`setTimestamp()`](/reference/logger/#settimestamp) | Affiche ou masque les horodatages, ou définit leur motif. |
| [`setDelimiter()`](/reference/logger/#setdelimiter) | Change les délimiteurs du balisage, pour les cas où `<%` entre en conflit avec un moteur de templates. |
| [`createLogger()`](/reference/logger/#createlogger) | Crée un logger avec ses propres réglages. |

### nc.fs

Fichiers et dossiers sans try/catch : lire et écrire du texte ou du JSON (de façon atomique), copier, déplacer, supprimer, lister, rechercher par motif glob, surveiller, calculer un hash. [Référence](/reference/fs/) • [Guide](/essentials/fs/)

| Nom | Rôle |
| --- | --- |
| [`getEnv()`](/reference/fs/#getenv) | Lit une variable d'environnement. |
| [`createPath()`](/reference/fs/#createpath) | La version absolue d'un chemin, qu'il existe ou non. |
| [`getFolder()`](/reference/fs/#getfolder) | Le chemin absolu d'un dossier, ou `undefined` s'il n'existe pas. |
| [`getFile()`](/reference/fs/#getfile) | Le chemin absolu d'un fichier, ou `undefined` s'il n'existe pas. |
| [`getFoldersIn()`](/reference/fs/#getfoldersin) | Les dossiers contenus dans un dossier, dossiers imbriqués compris par défaut. |
| [`getFilesIn()`](/reference/fs/#getfilesin) | Les fichiers contenus dans un dossier, fichiers des dossiers imbriqués compris par défaut. |
| [`glob()`](/reference/fs/#glob) | Trouve les chemins qui correspondent à un motif glob : `*` (tout sauf `/`), `**` (toute profondeur), `?`, `[abc]` et `{js,ts}`. |
| [`find()`](/reference/fs/#find) | Cherche dans une arborescence de dossiers le premier fichier ou dossier portant ce nom, en commençant par le plus proche. |
| [`findUp()`](/reference/fs/#findup) | Cherche un fichier ou un dossier dans un dossier, puis dans son parent, et ainsi de suite jusqu'à la racine. |
| [`readFile()`](/reference/fs/#readfile) | Lit un fichier sous forme de texte, ou de Buffer avec `"buffer"`. |
| [`readLines()`](/reference/fs/#readlines) | Lit un fichier texte sous forme de lignes. |
| [`readJSON()`](/reference/fs/#readjson) | Lit un fichier JSON. |
| [`writeFile()`](/reference/fs/#writefile) | Écrit un fichier de façon atomique, en créant ses dossiers. |
| [`writeJSON()`](/reference/fs/#writejson) | Écrit une valeur en JSON, de façon atomique, en créant les dossiers. |
| [`appendFile()`](/reference/fs/#appendfile) | Ajoute à la fin d'un fichier, en le créant avec ses dossiers si nécessaire. |
| [`createFile()`](/reference/fs/#createfile) | Crée un fichier et ses dossiers. |
| [`createFolder()`](/reference/fs/#createfolder) | Crée un dossier et ses parents. |
| [`ensureFolder()`](/reference/fs/#ensurefolder) | S'assure qu'un dossier existe et renvoie son chemin absolu. |
| [`ensureFile()`](/reference/fs/#ensurefile) | S'assure qu'un fichier existe (vide si nécessaire) et renvoie son chemin absolu. |
| [`touch()`](/reference/fs/#touch) | Met à jour la date de modification d'un fichier, en le créant si nécessaire, comme la commande Unix `touch`. |
| [`deleteFolder()`](/reference/fs/#deletefolder) | Supprime un dossier et tout son contenu. |
| [`deleteFile()`](/reference/fs/#deletefile) | Supprime un fichier. |
| [`remove()`](/reference/fs/#remove) | Supprime un fichier ou un dossier, selon le cas. |
| [`deleteFoldersIn()`](/reference/fs/#deletefoldersin) | Supprime, dans un dossier, les dossiers qui passent un test. |
| [`deleteFilesIn()`](/reference/fs/#deletefilesin) | Supprime, dans un dossier, les fichiers qui passent un test. |
| [`emptyFolder()`](/reference/fs/#emptyfolder) | Supprime tout le contenu d'un dossier, en conservant le dossier. |
| [`copy()`](/reference/fs/#copy) | Copie un fichier ou un dossier entier, comme `cp -r`. |
| [`move()`](/reference/fs/#move) | Déplace ou renomme un fichier ou un dossier, y compris d'un disque à un autre. |
| [`copyFoldersIn()`](/reference/fs/#copyfoldersin) | Copie les dossiers contenus dans un dossier vers un autre. |
| [`copyFolder()`](/reference/fs/#copyfolder) | Copie un dossier. |
| [`copyFilesIn()`](/reference/fs/#copyfilesin) | Copie les fichiers contenus dans un dossier vers un autre, en conservant l'arborescence. |
| [`copyFile()`](/reference/fs/#copyfile) | Copie un fichier. |
| [`moveFoldersIn()`](/reference/fs/#movefoldersin) | Déplace les dossiers contenus dans un dossier. |
| [`moveFolder()`](/reference/fs/#movefolder) | Déplace un dossier. |
| [`moveFilesIn()`](/reference/fs/#movefilesin) | Déplace les fichiers contenus dans un dossier. |
| [`moveFile()`](/reference/fs/#movefile) | Déplace un fichier. |
| [`exists()`](/reference/fs/#exists) | Un fichier ou un dossier existe-t-il à ce chemin ? |
| [`isFile()`](/reference/fs/#isfile) | Est-ce un fichier existant ? |
| [`isFolder()`](/reference/fs/#isfolder) | Est-ce un dossier existant ? |
| [`stat()`](/reference/fs/#stat) | Taille, dates et type d'un chemin. |
| [`fileSize()`](/reference/fs/#filesize) | La taille d'un fichier en octets. |
| [`folderSize()`](/reference/fs/#foldersize) | La taille totale de tous les fichiers d'un dossier. |
| [`hashFile()`](/reference/fs/#hashfile) | Calcule le hash d'un fichier par morceaux, les très gros fichiers ne posent donc pas de problème. |
| [`tempFolder()`](/reference/fs/#tempfolder) | Crée un nouveau dossier unique dans le répertoire temporaire du système. |
| [`sanitizeFilename()`](/reference/fs/#sanitizefilename) | Transforme n'importe quel texte en un nom de fichier valide sous Windows, macOS et Linux : les caractères interdits sont remplacés, les noms réservés comme `CON` sont préfixés, et la longueur est plafonnée. |
| [`watch()`](/reference/fs/#watch) | Surveille les modifications d'un fichier ou d'un dossier. |

### nc.checker

Vérifications de type et validateurs. [Référence](/reference/checker/) • [Guide](/essentials/checker/)

| Nom | Rôle |
| --- | --- |
| [`isArray()`](/reference/checker/#isarray) | Est-ce un tableau ? |
| [`isNumber()`](/reference/checker/#isnumber) | Est-ce un nombre ? |
| [`isFinite()`](/reference/checker/#isfinite) | Est-ce un nombre fini ? |
| [`isInteger()`](/reference/checker/#isinteger) | Est-ce un entier ? |
| [`isSafeInteger()`](/reference/checker/#issafeinteger) | Est-ce un entier que JavaScript peut représenter exactement (jusqu'à 2^53 - 1) ? |
| [`isFloat()`](/reference/checker/#isfloat) | Est-ce un nombre fini avec une partie décimale ? |
| [`isPositive()`](/reference/checker/#ispositive) | Est-ce un nombre supérieur à zéro ? |
| [`isNegative()`](/reference/checker/#isnegative) | Est-ce un nombre inférieur à zéro ? |
| [`isBoolean()`](/reference/checker/#isboolean) | Est-ce `true` ou `false` ? |
| [`isString()`](/reference/checker/#isstring) | Est-ce une chaîne ? |
| [`isSymbol()`](/reference/checker/#issymbol) | Est-ce un symbole ? |
| [`isBigInt()`](/reference/checker/#isbigint) | Est-ce un bigint ? |
| [`isUndefined()`](/reference/checker/#isundefined) | Est-ce `undefined` ? |
| [`isNull()`](/reference/checker/#isnull) | Est-ce `null` ? |
| [`isNil()`](/reference/checker/#isnil) | Est-ce `null` ou `undefined` ? |
| [`isDefined()`](/reference/checker/#isdefined) | Est-ce autre chose que `null` ou `undefined` ? |
| [`isPrimitive()`](/reference/checker/#isprimitive) | Est-ce une primitive (chaîne, nombre, booléen, symbole, bigint, `null` ou `undefined`) ? |
| [`isFunction()`](/reference/checker/#isfunction) | Peut-on l'appeler ? |
| [`isAsyncFunction()`](/reference/checker/#isasyncfunction) | A-t-elle été déclarée avec `async` ? |
| [`isGeneratorFunction()`](/reference/checker/#isgeneratorfunction) | Est-ce une fonction génératrice (`function*`) ? |
| [`isGenerator()`](/reference/checker/#isgenerator) | Est-ce un objet générateur, le résultat de l'appel d'une `function*` ? |
| [`isClass()`](/reference/checker/#isclass) | Est-ce une `class` plutôt qu'une fonction ordinaire ? |
| [`isObject()`](/reference/checker/#isobject) | Est-ce un objet, et non `null` ? |
| [`isPlainObject()`](/reference/checker/#isplainobject) | Est-ce un objet simple, créé avec `{}`, `new Object()` ou `Object.create(null)` ? |
| [`isPromise()`](/reference/checker/#ispromise) | Peut-on l'attendre comme une promesse (tout ce qui possède une méthode `then`) ? |
| [`isRegExp()`](/reference/checker/#isregexp) | Est-ce une expression régulière ? |
| [`isDate()`](/reference/checker/#isdate) | Est-ce une `Date`, valide ou non ? |
| [`isValidDate()`](/reference/checker/#isvaliddate) | Est-ce une `Date` qui représente un instant réel ? |
| [`isMap()`](/reference/checker/#ismap) | Est-ce une `Map` ? |
| [`isSet()`](/reference/checker/#isset) | Est-ce un `Set` ? |
| [`isWeakMap()`](/reference/checker/#isweakmap) | Est-ce une `WeakMap` ? |
| [`isWeakSet()`](/reference/checker/#isweakset) | Est-ce un `WeakSet` ? |
| [`isIterable()`](/reference/checker/#isiterable) | Est-ce utilisable avec `for...of` ? |
| [`isAsyncIterable()`](/reference/checker/#isasynciterable) | Est-ce utilisable avec `for await...of`, comme les streams et les générateurs asynchrones ? |
| [`isBuffer()`](/reference/checker/#isbuffer) | Est-ce un `Buffer` Node.js ? |
| [`isTypedArray()`](/reference/checker/#istypedarray) | Est-ce un tableau typé (`Uint8Array`, `Float64Array`...) ? |
| [`isError()`](/reference/checker/#iserror) | Est-ce une `Error`, y compris les sous-classes et les erreurs venant d'autres realms ? |
| [`isEmpty()`](/reference/checker/#isempty) | Est-ce vide ? |
| [`isBlank()`](/reference/checker/#isblank) | Est-ce `null`, `undefined`, ou une chaîne qui ne contient que des espaces ? |
| [`isArrayOf()`](/reference/checker/#isarrayof) | Est-ce un tableau dont chaque élément passe `guard` ? |
| [`isOneOf()`](/reference/checker/#isoneof) | Est-ce l'une des valeurs autorisées ? |
| [`isEmail()`](/reference/checker/#isemail) | Cela ressemble-t-il à une adresse e-mail ? |
| [`isURL()`](/reference/checker/#isurl) | Est-ce une URL absolue avec un protocole autorisé (http et https par défaut) ? |
| [`isUUID()`](/reference/checker/#isuuid) | Est-ce un UUID ? |
| [`isJSON()`](/reference/checker/#isjson) | Est-ce une chaîne contenant du JSON valide ? |
| [`isNumeric()`](/reference/checker/#isnumeric) | Est-ce un nombre fini, ou une chaîne qui en représente exactement un (les espaces autour sont acceptés) ? |
| [`isIP()`](/reference/checker/#isip) | Est-ce une adresse IP ? |
| [`isIPv4()`](/reference/checker/#isipv4) | Est-ce une adresse IPv4, comme `192.168.0.1` ? |
| [`isIPv6()`](/reference/checker/#isipv6) | Est-ce une adresse IPv6, comme `::1` ? |
| [`isPort()`](/reference/checker/#isport) | Est-ce un port valide (0 à 65535), sous forme de nombre ou de chaîne numérique ? |
| [`isHex()`](/reference/checker/#ishex) | Est-ce une chaîne hexadécimale ? |
| [`isHexColor()`](/reference/checker/#ishexcolor) | Est-ce une couleur hexadécimale CSS (`#rgb`, `#rgba`, `#rrggbb` ou `#rrggbbaa`) ? |
| [`isBase64()`](/reference/checker/#isbase64) | Est-ce du Base64 valide ? |
| [`isSemver()`](/reference/checker/#issemver) | Est-ce une version sémantique ? |
| [`isISODate()`](/reference/checker/#isisodate) | Est-ce une date ou une date et heure ISO 8601, et une date réelle du calendrier ? |
| [`isSlug()`](/reference/checker/#isslug) | Est-ce un slug d'URL comme `my-first-post` ? |
| [`isAlpha()`](/reference/checker/#isalpha) | Est-ce composé uniquement de lettres, quel que soit l'alphabet ? |
| [`isAlphanumeric()`](/reference/checker/#isalphanumeric) | Est-ce composé uniquement de lettres et de chiffres, quel que soit l'alphabet ? |
| [`isCreditCard()`](/reference/checker/#iscreditcard) | Cela pourrait-il être un numéro de carte ? |
| [`isJWT()`](/reference/checker/#isjwt) | Cela ressemble-t-il à un JSON Web Token ? |
| [`isHostname()`](/reference/checker/#ishostname) | Est-ce un nom d'hôte, comme `example.com`, `api.internal` ou `localhost` ? |
| [`isMACAddress()`](/reference/checker/#ismacaddress) | Est-ce une adresse MAC ? |
| [`isIBAN()`](/reference/checker/#isiban) | Est-ce un IBAN valide ? |
| [`isE164()`](/reference/checker/#ise164) | Est-ce un numéro de téléphone au format international E.164 : un `+`, puis 7 à 15 chiffres, sans espace ? |
| [`isObjectId()`](/reference/checker/#isobjectid) | Est-ce un ObjectId MongoDB, 24 caractères hexadécimaux ? |
| [`isULID()`](/reference/checker/#isulid) | Est-ce un ULID, comme ceux que produit `nc.id.ulid()` ? |
| [`isDataURL()`](/reference/checker/#isdataurl) | Est-ce une URL `data:`, comme une image intégrée ? |
| [`isMimeType()`](/reference/checker/#ismimetype) | Est-ce un type de média, comme `application/json` ou `text/html; charset=utf-8` ? |
| [`isTimeZone()`](/reference/checker/#istimezone) | Est-ce un fuseau horaire connu de Node.js, comme `"Europe/Paris"` ou `"UTC"` ? |
| [`isLocale()`](/reference/checker/#islocale) | Est-ce une locale bien formée, comme `"fr"`, `"en-GB"` ou `"zh-Hant-TW"` ? |
| [`isCron()`](/reference/checker/#iscron) | Est-ce une expression cron que `nc.time.cron()` comprend ? |
| [`isASCII()`](/reference/checker/#isascii) | Est-ce composé uniquement de caractères ASCII ? |
| [`assert()`](/reference/checker/#assert) | Lève une `AssertionError` si `condition` est falsy. |
| [`assertType()`](/reference/checker/#asserttype) | Lève une `AssertionError` sauf si `value` passe `guard`. |

### nc.env

Des variables d'environnement fiables : chargement de `.env`, accesseurs typés, et `validate()` pour vérifier toute votre configuration au démarrage et signaler tous les problèmes d'un coup. [Référence](/reference/env/) • [Guide](/essentials/env/)

| Nom | Rôle |
| --- | --- |
| [`parse()`](/reference/env/#parse) | Analyse le texte d'un fichier `.env` : guillemets, valeurs multilignes, `export`, commentaires, échappements et expansion de `${VAR}` (sauf entre guillemets simples). |
| [`load()`](/reference/env/#load) | Charge des fichiers `.env` dans `process.env`. |
| [`get()`](/reference/env/#get) | Lit une variable, avec une valeur de repli. |
| [`has()`](/reference/env/#has) | La variable est-elle définie, même avec une chaîne vide ? |
| [`required()`](/reference/env/#required) | Lit une variable qui doit être définie et non vide. |
| [`string()`](/reference/env/#string) | Lit une chaîne. |
| [`number()`](/reference/env/#number) | Lit un nombre. |
| [`bool()`](/reference/env/#bool) | Lit un booléen : `true`/`false`, `1`/`0`, `yes`/`no` ou `on`/`off`. |
| [`port()`](/reference/env/#port) | Lit un numéro de port. |
| [`url()`](/reference/env/#url) | Lit une URL absolue. |
| [`duration()`](/reference/env/#duration) | Lit une durée comme `"30s"` ou `"1h30m"` et renvoie des millisecondes. |
| [`list()`](/reference/env/#list) | Lit une liste séparée par des virgules. |
| [`json()`](/reference/env/#json) | Lit une valeur JSON. |
| [`oneOf()`](/reference/env/#oneof) | Lit une variable qui doit être l'une des valeurs données. |
| [`validate()`](/reference/env/#validate) | Vérifie toutes vos variables d'un coup et renvoie une configuration typée et gelée. |
| [`example()`](/reference/env/#example) | Écrit le `.env.example` qui accompagne une spécification `validate()` : une entrée par variable, avec sa description, son type et sa valeur par défaut. |
| [`mode()`](/reference/env/#mode) | `NODE_ENV`, ou `"development"` quand elle n'est pas définie. |
| [`isProduction()`](/reference/env/#isproduction) | `NODE_ENV` vaut-elle `"production"` ? |
| [`isDevelopment()`](/reference/env/#isdevelopment) | `NODE_ENV` vaut-elle `"development"`, ou n'est-elle pas définie ? |
| [`isTest()`](/reference/env/#istest) | Des tests sont-ils en cours ? |

### nc.errors

Les erreurs que node-comfort lève quand quelque chose se passe mal à l'exécution : une requête échoue, des données sont invalides, une commande se termine mal. [Référence](/reference/errors/) • [Guide](/essentials/errors/)

| Nom | Rôle |
| --- | --- |
| [`NodeComfortError`](/reference/errors/#nodecomforterror) | Classe de base de toutes les erreurs de node-comfort. |
| [`AssertionError`](/reference/errors/#assertionerror) | Levée par `nc.assert()` et `nc.assertType()`. |
| [`TimeoutError`](/reference/errors/#timeouterror) | Levée quand quelque chose prend trop de temps : `func.timeout`, `async.poll`, les requêtes HTTP, `emitter.waitFor`... |
| [`AbortError`](/reference/errors/#aborterror) | Levée quand une opération est annulée avec un `AbortSignal`. |
| [`ValidationError`](/reference/errors/#validationerror) | Levée quand des données ne correspondent pas à un schéma ou quand des variables d'environnement sont invalides. |
| [`HttpError`](/reference/errors/#httperror) | Levée par `nc.http` quand le statut de la réponse n'est pas 2xx (sauf si vous passez `throwHttpErrors: false`), et pour les échecs réseau (`status` 0). |
| [`JWTError`](/reference/errors/#jwterror) | Levée par `nc.crypto.verifyJWT()`. |
| [`ProcessError`](/reference/errors/#processerror) | Levée par `nc.sys.run()` et `nc.sys.exec()` quand une commande échoue, est tuée ou dépasse son délai. |
| [`SQLiteError`](/reference/errors/#sqliteerror) | Levée par `nc.SQLite` quand une instruction échoue. |

### nc.utils

Les utilitaires du quotidien : `wait`, `when`, `dontCrash`, et des fonctions JSON qui ne lèvent pas d'erreur. [Référence](/reference/utils/) • [Guide](/essentials/utils/)

| Nom | Rôle |
| --- | --- |
| [`wait()`](/reference/utils/#wait) | Se résout après un délai, donné en millisecondes ou sous forme de chaîne de durée. |
| [`when()`](/reference/utils/#when) | Vérifie une condition à intervalle régulier et vous prévient quand elle est vraie. |
| [`dontCrash()`](/reference/utils/#dontcrash) | Maintient le processus en vie quand quelque chose tourne mal. |
| [`JSONString()`](/reference/utils/#jsonstring) | `JSON.stringify` qui ne lève jamais d'erreur. |
| [`JSONParse()`](/reference/utils/#jsonparse) | `JSON.parse` avec une valeur de repli facultative. |

## Données

### nc.str

Utilitaires pour les chaînes : conversion de casse, slugs, troncature, gabarits, retour à la ligne, correspondance approximative, pluriels. [Référence](/reference/str/) • [Guide](/data/str/)

| Nom | Rôle |
| --- | --- |
| [`capitalize()`](/reference/str/#capitalize) | Met le premier caractère en majuscule et le reste en minuscules. |
| [`upperFirst()`](/reference/str/#upperfirst) | Met le premier caractère en majuscule et laisse le reste tel quel. |
| [`lowerFirst()`](/reference/str/#lowerfirst) | Met le premier caractère en minuscule et laisse le reste tel quel. |
| [`humanize()`](/reference/str/#humanize) | Transforme un identifiant en un libellé lisible. |
| [`titleCase()`](/reference/str/#titlecase) | Met la première lettre de chaque mot en majuscule et laisse le reste tel quel. |
| [`sentenceCase()`](/reference/str/#sentencecase) | Met tout en minuscules, puis une majuscule au début de chaque phrase. |
| [`camelCase()`](/reference/str/#camelcase) | Convertit en `camelCase`. |
| [`pascalCase()`](/reference/str/#pascalcase) | Convertit en `PascalCase`. |
| [`snakeCase()`](/reference/str/#snakecase) | Convertit en `snake_case`. |
| [`kebabCase()`](/reference/str/#kebabcase) | Convertit en `kebab-case`. |
| [`constantCase()`](/reference/str/#constantcase) | Convertit en `CONSTANT_CASE`. |
| [`dotCase()`](/reference/str/#dotcase) | Convertit en `dot.case`. |
| [`words()`](/reference/str/#words) | Découpe un texte en mots. |
| [`deburr()`](/reference/str/#deburr) | Retire les accents (`é` devient `e`) et développe les lettres latines spéciales (`ß` devient `ss`, `æ` devient `ae`). |
| [`slugify()`](/reference/str/#slugify) | Transforme un texte en slug d'URL : sans accents, en minuscules, les mots reliés par des tirets. |
| [`squish()`](/reference/str/#squish) | Réduit chaque suite d'espaces à un seul espace et retire les espaces au début et à la fin. |
| [`stripTags()`](/reference/str/#striptags) | Retire les balises HTML et garde le texte. |
| [`escapeHTML()`](/reference/str/#escapehtml) | Échappe `& < > " '` pour que le texte soit sûr dans du contenu et des attributs HTML. |
| [`unescapeHTML()`](/reference/str/#unescapehtml) | Décode les entités HTML : les entités nommées comme `&amp;` et `&nbsp;`, et les entités numériques comme `&#233;`. |
| [`escapeRegExp()`](/reference/str/#escaperegexp) | Échappe les caractères spéciaux des expressions régulières pour que le texte soit recherché littéralement. |
| [`length()`](/reference/str/#length) | Compte les caractères tels que vous les voyez. |
| [`byteLength()`](/reference/str/#bytelength) | Taille du texte en octets une fois encodé, en UTF-8 par défaut. |
| [`count()`](/reference/str/#count) | Compte le nombre d'occurrences de `search`, sans chevauchement. |
| [`truncate()`](/reference/str/#truncate) | Raccourcit un texte à `length` caractères tels que vous les voyez, en terminant par `…` s'il est coupé. |
| [`chunk()`](/reference/str/#chunk) | Découpe un texte en morceaux de `size` caractères tels que vous les voyez. |
| [`between()`](/reference/str/#between) | Renvoie le texte situé entre `start` et le prochain `end`, ou `undefined` si un marqueur est absent. |
| [`splitOnce()`](/reference/str/#splitonce) | Découpe uniquement à la première occurrence de `separator`. |
| [`lines()`](/reference/str/#lines) | Découpe un texte en lignes, quelles que soient les fins de ligne. |
| [`padStart()`](/reference/str/#padstart) | Complète le début jusqu'à ce que le texte fasse `length` caractères. |
| [`padEnd()`](/reference/str/#padend) | Complète la fin jusqu'à ce que le texte fasse `length` caractères. |
| [`center()`](/reference/str/#center) | Centre un texte sur `length` caractères. |
| [`indent()`](/reference/str/#indent) | Indente chaque ligne non vide. |
| [`dedent()`](/reference/str/#dedent) | Retire l'indentation commune à toutes les lignes, ainsi que la première et la dernière ligne quand elles sont vides. |
| [`wrap()`](/reference/str/#wrap) | Renvoie le texte à la ligne pour qu'aucune ligne ne dépasse `width` caractères tels que vous les voyez. |
| [`reverse()`](/reference/str/#reverse) | Inverse un texte sans casser les emojis ni les accents. |
| [`mask()`](/reference/str/#mask) | Masque une partie d'une chaîne, comme un numéro de carte ou un token. |
| [`initials()`](/reference/str/#initials) | Les initiales d'un nom, en majuscules. |
| [`plural()`](/reference/str/#plural) | Choisit le bon pluriel pour un nombre, selon les règles de la langue, et place le nombre formaté devant. |
| [`template()`](/reference/str/#template) | Remplace les `{placeholders}` par des valeurs. |
| [`ensurePrefix()`](/reference/str/#ensureprefix) | Ajoute `prefix`, sauf si le texte commence déjà par celui-ci. |
| [`ensureSuffix()`](/reference/str/#ensuresuffix) | Ajoute `suffix`, sauf si le texte se termine déjà par celui-ci. |
| [`removePrefix()`](/reference/str/#removeprefix) | Retire `prefix` si le texte commence par celui-ci. |
| [`removeSuffix()`](/reference/str/#removesuffix) | Retire `suffix` si le texte se termine par celui-ci. |
| [`compare()`](/reference/str/#compare) | Compare deux chaînes comme une personne les trierait : les nombres dans l'ordre naturel et les accents au bon endroit. |
| [`levenshtein()`](/reference/str/#levenshtein) | Le nombre de modifications d'un seul caractère nécessaires pour transformer `a` en `b`. |
| [`similarity()`](/reference/str/#similarity) | Le degré de ressemblance entre deux chaînes, de `0` (rien en commun) à `1` (identiques). |
| [`closest()`](/reference/str/#closest) | Trouve le candidat le plus proche de `input`. |
| [`random()`](/reference/str/#random) | Une chaîne aléatoire. |

### nc.num

Nombres : bornage, arrondi qui traite correctement les décimales, statistiques, et formatage pour les humains (tailles, monnaie, ordinaux, nombres compacts) dans n'importe quelle langue. [Référence](/reference/num/) • [Guide](/data/num/)

| Nom | Rôle |
| --- | --- |
| [`setLocale()`](/reference/num/#setlocale) | Définit la langue par défaut de `format`, `currency`, `ordinal` et `formatBytes`. |
| [`getLocale()`](/reference/num/#getlocale) | La langue par défaut actuelle. |
| [`clamp()`](/reference/num/#clamp) | Maintient un nombre entre `min` et `max`. |
| [`inRange()`](/reference/num/#inrange) | Le nombre est-il entre `min` et `max`, bornes comprises ? |
| [`wrap()`](/reference/num/#wrap) | Ramène un nombre dans un intervalle en bouclant, comme un angle ou l'index d'un carrousel. |
| [`round()`](/reference/num/#round) | Arrondit à `decimals` décimales sans les surprises de la virgule flottante : `Math.round(1.005 * 100) / 100` donne `1`, cette fonction donne `1.01`. |
| [`floor()`](/reference/num/#floor) | Arrondit vers le bas à `decimals` décimales. |
| [`ceil()`](/reference/num/#ceil) | Arrondit vers le haut à `decimals` décimales. |
| [`snap()`](/reference/num/#snap) | Arrondit au multiple de `step` le plus proche. |
| [`approxEqual()`](/reference/num/#approxequal) | Deux nombres sont-ils égaux à une petite tolérance près ? |
| [`lerp()`](/reference/num/#lerp) | La valeur au ratio `t` entre `start` et `end`. |
| [`mapRange()`](/reference/num/#maprange) | Transpose un nombre d'un intervalle à un autre, en conservant sa position relative. |
| [`random()`](/reference/num/#random) | Un nombre à virgule flottante aléatoire, de `min` (inclus) à `max` (exclu). |
| [`randomInt()`](/reference/num/#randomint) | Un entier aléatoire de `min` à `max`, bornes comprises. |
| [`sum()`](/reference/num/#sum) | Additionne des nombres, sans la dérive d'une boucle naïve. |
| [`product()`](/reference/num/#product) | Multiplie des nombres. |
| [`average()`](/reference/num/#average) | La moyenne, ou `0` pour une liste vide. |
| [`median()`](/reference/num/#median) | La valeur du milieu une fois la liste triée, ou `0` pour une liste vide. |
| [`mode()`](/reference/num/#mode) | Les valeurs les plus fréquentes. |
| [`variance()`](/reference/num/#variance) | La variance : la moyenne des carrés des écarts à la moyenne. |
| [`stdDev()`](/reference/num/#stddev) | L'écart type. |
| [`percentile()`](/reference/num/#percentile) | La valeur sous laquelle se trouvent `p` pour cent des valeurs, interpolée comme le fait `PERCENTILE.INC` dans Excel. |
| [`min()`](/reference/num/#min) | Le plus petit nombre. |
| [`max()`](/reference/num/#max) | Le plus grand nombre. |
| [`percent()`](/reference/num/#percent) | Le pourcentage que `value` représente dans `total`. |
| [`percentChange()`](/reference/num/#percentchange) | De combien une valeur a changé, en pourcentage. |
| [`gcd()`](/reference/num/#gcd) | Plus grand commun diviseur. |
| [`lcm()`](/reference/num/#lcm) | Plus petit commun multiple. |
| [`isPrime()`](/reference/num/#isprime) | Est-ce un nombre premier ? |
| [`factorial()`](/reference/num/#factorial) | `n!`. |
| [`isEven()`](/reference/num/#iseven) | Est-il pair ? |
| [`isOdd()`](/reference/num/#isodd) | Est-il impair ? |
| [`range()`](/reference/num/#range) | Les nombres de `start` jusqu'à `end` (exclu). |
| [`parse()`](/reference/num/#parse) | Lit un nombre à partir de n'importe quelle valeur, en ignorant le texte qui le suit, comme les unités. |
| [`parseBytes()`](/reference/num/#parsebytes) | Convertit une taille comme `"10 MB"` en octets. |
| [`formatBytes()`](/reference/num/#formatbytes) | Formate un nombre d'octets en taille lisible. |
| [`format()`](/reference/num/#format) | Formate un nombre pour l'affichage, en s'appuyant sur `Intl.NumberFormat` : séparateurs, décimales, notation compacte, pourcentages, unités. |
| [`currency()`](/reference/num/#currency) | Formate une somme d'argent. |
| [`abbreviate()`](/reference/num/#abbreviate) | Abrège les grands nombres avec `K`, `M`, `B` ou `T`. |
| [`thousands()`](/reference/num/#thousands) | Ajoute les séparateurs de milliers, sans toucher aux décimales. |
| [`pad()`](/reference/num/#pad) | Complète la partie entière avec des zéros (ou un autre caractère). |
| [`ordinal()`](/reference/num/#ordinal) | Ajoute le suffixe ordinal : 1st, 2nd, 3rd... dans plusieurs langues. |

### nc.arr

Utilitaires pour les tableaux. [Référence](/reference/arr/) • [Guide](/data/arr/)

| Nom | Rôle |
| --- | --- |
| [`chunk()`](/reference/arr/#chunk) | Découpe un tableau en groupes de `size` éléments. |
| [`windows()`](/reference/arr/#windows) | Fenêtres glissantes de `size` éléments, décalées de `step`. |
| [`first()`](/reference/arr/#first) | Le premier élément, ou les `n` premiers éléments. |
| [`last()`](/reference/arr/#last) | Le dernier élément, ou les `n` derniers éléments. |
| [`paginate()`](/reference/arr/#paginate) | Une page d'un tableau, avec ce qu'il faut pour afficher des contrôles de pagination. |
| [`unique()`](/reference/arr/#unique) | Retire les doublons. |
| [`groupBy()`](/reference/arr/#groupby) | Regroupe les éléments par clé. |
| [`keyBy()`](/reference/arr/#keyby) | Indexe les éléments par clé. |
| [`toMap()`](/reference/arr/#tomap) | Construit une `Map` à partir d'un tableau. |
| [`countBy()`](/reference/arr/#countby) | Compte les éléments par clé. |
| [`count()`](/reference/arr/#count) | Compte les éléments qui passent un test. |
| [`partition()`](/reference/arr/#partition) | Sépare les éléments entre ceux qui passent un test et ceux qui ne le passent pas. |
| [`pluck()`](/reference/arr/#pluck) | Extrait une propriété de chaque élément. |
| [`sortBy()`](/reference/arr/#sortby) | Trie selon une ou plusieurs clés, chacune avec son propre sens si vous le souhaitez. |
| [`shuffle()`](/reference/arr/#shuffle) | Une copie mélangée (Fisher-Yates). |
| [`sample()`](/reference/arr/#sample) | Un élément au hasard, ou `undefined` si le tableau est vide. |
| [`sampleSize()`](/reference/arr/#samplesize) | `n` éléments au hasard, jamais deux fois le même. |
| [`rotate()`](/reference/arr/#rotate) | Fait tourner les éléments. |
| [`move()`](/reference/arr/#move) | Déplace un élément vers une autre position. |
| [`swap()`](/reference/arr/#swap) | Échange deux éléments. |
| [`difference()`](/reference/arr/#difference) | Les éléments de `array` qui n'apparaissent dans aucun des autres. |
| [`intersection()`](/reference/arr/#intersection) | Les éléments présents dans tous les tableaux, sans doublons. |
| [`union()`](/reference/arr/#union) | Les éléments présents dans au moins un tableau, sans doublons. |
| [`without()`](/reference/arr/#without) | Une copie sans les valeurs données. |
| [`remove()`](/reference/arr/#remove) | Une copie sans les éléments qui passent le test. |
| [`compact()`](/reference/arr/#compact) | Retire les valeurs falsy (`false`, `null`, `undefined`, `0`, `""`, `NaN`). |
| [`toggle()`](/reference/arr/#toggle) | Ajoute l'élément s'il est absent, le retire s'il est présent. |
| [`upsert()`](/reference/arr/#upsert) | Remplace l'élément de même identité, ou l'ajoute à la fin s'il n'y en a pas. |
| [`insert()`](/reference/arr/#insert) | Insère des éléments à un index. |
| [`flatten()`](/reference/arr/#flatten) | Aplatit les tableaux imbriqués, d'un niveau par défaut. |
| [`zip()`](/reference/arr/#zip) | Associe les éléments par position. |
| [`unzip()`](/reference/arr/#unzip) | L'inverse de `zip()` : les lignes deviennent des colonnes. |
| [`interleave()`](/reference/arr/#interleave) | Prend les éléments de chaque tableau à tour de rôle, puis ajoute le reste à la fin. |
| [`cartesian()`](/reference/arr/#cartesian) | Toutes les combinaisons d'un élément de chaque tableau. |
| [`times()`](/reference/arr/#times) | Un tableau de `n` éléments, à partir d'une valeur ou d'une fonction de l'index. |
| [`sumBy()`](/reference/arr/#sumby) | Additionne un nombre tiré de chaque élément. |
| [`averageBy()`](/reference/arr/#averageby) | La moyenne d'un nombre tiré de chaque élément, ou `0` pour un tableau vide. |
| [`maxBy()`](/reference/arr/#maxby) | L'élément dont la valeur est la plus élevée. |
| [`minBy()`](/reference/arr/#minby) | L'élément dont la valeur est la plus basse. |
| [`duplicates()`](/reference/arr/#duplicates) | Les éléments qui apparaissent plus d'une fois, chacun listé une seule fois. |
| [`xor()`](/reference/arr/#xor) | Les éléments présents dans un seul des tableaux exactement, sans doublons. |
| [`takeWhile()`](/reference/arr/#takewhile) | Les éléments depuis le début, jusqu'au premier qui échoue au test. |
| [`dropWhile()`](/reference/arr/#dropwhile) | Ignore les éléments depuis le début tant qu'ils passent le test, et renvoie le reste. |
| [`toSentence()`](/reference/arr/#tosentence) | Assemble les éléments comme dans une phrase, dans n'importe quelle langue. |

### nc.obj

Utilitaires pour les objets : copie profonde, fusion, égalité, différences, chemins pointés typés, pick et omit. [Référence](/reference/obj/) • [Guide](/data/obj/)

| Nom | Rôle |
| --- | --- |
| [`clone()`](/reference/obj/#clone) | Copie profonde. |
| [`merge()`](/reference/obj/#merge) | Fusionne des objets en profondeur dans un nouvel objet. |
| [`mergeWith()`](/reference/obj/#mergewith) | Comme `merge()`, avec le choix de ce qui arrive aux tableaux et à `undefined`. |
| [`defaults()`](/reference/obj/#defaults) | Complète les propriétés manquantes à partir de valeurs par défaut, en profondeur. |
| [`equal()`](/reference/obj/#equal) | Égalité profonde. |
| [`diff()`](/reference/obj/#diff) | Liste ce qui a changé entre deux valeurs, en profondeur. |
| [`get()`](/reference/obj/#get) | Lit une valeur imbriquée à partir d'un chemin pointé. |
| [`set()`](/reference/obj/#set) | Renvoie une copie dans laquelle une valeur imbriquée est définie. |
| [`update()`](/reference/obj/#update) | Renvoie une copie où la valeur située à `path` est remplacée par ce que `updater` renvoie pour elle. |
| [`unset()`](/reference/obj/#unset) | Renvoie une copie sans la propriété située à `path`. |
| [`has()`](/reference/obj/#has) | Le chemin existe-t-il ? |
| [`pick()`](/reference/obj/#pick) | Une copie avec seulement les clés listées. |
| [`omit()`](/reference/obj/#omit) | Une copie sans les clés listées. |
| [`filter()`](/reference/obj/#filter) | Garde les entrées qui passent un test. |
| [`mapValues()`](/reference/obj/#mapvalues) | Transforme chaque valeur, en gardant les clés. |
| [`mapKeys()`](/reference/obj/#mapkeys) | Transforme chaque clé, en gardant les valeurs. |
| [`renameKeys()`](/reference/obj/#renamekeys) | Renomme certaines clés et laisse les autres telles quelles. |
| [`invert()`](/reference/obj/#invert) | Échange les clés et les valeurs. |
| [`compact()`](/reference/obj/#compact) | Retire les valeurs `null` et `undefined`, et éventuellement les valeurs vides. |
| [`flatten()`](/reference/obj/#flatten) | Aplatit les objets imbriqués en clés pointées. |
| [`unflatten()`](/reference/obj/#unflatten) | Reconstruit des objets imbriqués à partir de clés pointées. |
| [`paths()`](/reference/obj/#paths) | Tous les chemins feuilles d'un objet, sous forme pointée. |
| [`sortKeys()`](/reference/obj/#sortkeys) | Une copie dont les clés sont triées, objets imbriqués compris. |
| [`keys()`](/reference/obj/#keys) | `Object.keys`, mais typé avec les clés réelles de l'objet. |
| [`entries()`](/reference/obj/#entries) | `Object.entries`, avec des clés et des valeurs typées. |
| [`fromEntries()`](/reference/obj/#fromentries) | `Object.fromEntries` qui accepte n'importe quel itérable (une `Map` aussi) et ignore les clés dangereuses. |
| [`size()`](/reference/obj/#size) | Le nombre d'entrées : clés propres d'un objet, taille d'une Map ou d'un Set, longueur d'un tableau ou d'une chaîne. |
| [`isEmpty()`](/reference/obj/#isempty) | Est-il vide ? |
| [`deepFreeze()`](/reference/obj/#deepfreeze) | Gèle un objet et tout ce qu'il contient. |

### nc.time

Dates et durées : formatage, temps relatif, calcul calendaire, fuseaux horaires et planification, dans toutes les langues que `Intl` connaît. [Référence](/reference/time/) • [Guide](/data/time/)

| Nom | Rôle |
| --- | --- |
| [`setLocale()`](/reference/time/#setlocale) | Définit la langue par défaut de `relative`, `calendar`, `formatDuration` et `format`. |
| [`setTimezone()`](/reference/time/#settimezone) | Définit le fuseau horaire par défaut de `format`, `calendar`, `isSameDay`, `cron`... |
| [`getConfig()`](/reference/time/#getconfig) | Les valeurs par défaut actuelles. |
| [`timezones()`](/reference/time/#timezones) | Tous les fuseaux horaires que Node connaît, triés. |
| [`offset()`](/reference/time/#offset) | Le décalage UTC d'un fuseau à une date donnée, en minutes. |
| [`parseDuration()`](/reference/time/#parseduration) | Convertit une durée en millisecondes. |
| [`formatDuration()`](/reference/time/#formatduration) | Écrit une durée sous une forme lisible par un humain. |
| [`relative()`](/reference/time/#relative) | Décrit une date par rapport à maintenant : `"3 hours ago"`, `"in 2 days"`, dans n'importe quelle langue. |
| [`calendar()`](/reference/time/#calendar) | Décrit une date comme le fait une application de messagerie : `"Today at 2:30 PM"`, `"Yesterday at 9:05 AM"`, un jour de la semaine pour les jours à venir, et la date complète au-delà. |
| [`format()`](/reference/time/#format) | Formate une date avec des tokens, dans n'importe quelle langue et n'importe quel fuseau horaire. |
| [`parse()`](/reference/time/#parse) | Lit une date écrite dans un format connu : l'inverse de `format()`, avec les mêmes tokens. |
| [`toISODate()`](/reference/time/#toisodate) | La date sous la forme `YYYY-MM-DD`, le format qu'attendent `<input type="date">` et la plupart des API. |
| [`add()`](/reference/time/#add) | Ajoute du temps à une date et renvoie une nouvelle `Date`. |
| [`subtract()`](/reference/time/#subtract) | Soustrait du temps à une date et renvoie une nouvelle `Date`. |
| [`diff()`](/reference/time/#diff) | `a - b` dans une unité. |
| [`startOf()`](/reference/time/#startof) | Une nouvelle `Date` au début du jour, de la semaine, du mois... dans le fuseau horaire global, ou dans celui que vous indiquez. |
| [`endOf()`](/reference/time/#endof) | Une nouvelle `Date` à la dernière milliseconde du jour, de la semaine, du mois... |
| [`isBefore()`](/reference/time/#isbefore) | `a` est-elle avant `b` ? |
| [`isAfter()`](/reference/time/#isafter) | `a` est-elle après `b` ? |
| [`isBetween()`](/reference/time/#isbetween) | La date est-elle entre `start` et `end`, bornes comprises ? |
| [`isSame()`](/reference/time/#issame) | Les deux dates sont-elles dans la même année, le même mois, la même semaine, le même jour, la même heure... ? |
| [`isSameDay()`](/reference/time/#issameday) | Les deux dates tombent-elles le même jour calendaire ? |
| [`isToday()`](/reference/time/#istoday) | La date est-elle aujourd'hui ? |
| [`isYesterday()`](/reference/time/#isyesterday) | La date était-elle hier ? |
| [`isTomorrow()`](/reference/time/#istomorrow) | La date est-elle demain ? |
| [`isWeekend()`](/reference/time/#isweekend) | Est-ce un samedi ou un dimanche ? |
| [`isLeapYear()`](/reference/time/#isleapyear) | Est-ce une année bissextile ? |
| [`isValid()`](/reference/time/#isvalid) | Est-ce une vraie date, ou une valeur dont l'analyse en donne une ? |
| [`daysInMonth()`](/reference/time/#daysinmonth) | Nombre de jours dans un mois. |
| [`dayOfYear()`](/reference/time/#dayofyear) | Jour de l'année, de 1 à 366. |
| [`weekOfYear()`](/reference/time/#weekofyear) | Numéro de semaine ISO, de 1 à 53. |
| [`min()`](/reference/time/#min) | La date la plus ancienne. |
| [`max()`](/reference/time/#max) | La date la plus récente. |
| [`unix()`](/reference/time/#unix) | L'horodatage Unix actuel, en secondes. |
| [`fromUnix()`](/reference/time/#fromunix) | Une `Date` à partir d'un horodatage Unix en secondes, comme on en trouve dans les JWT et dans de nombreuses API. |
| [`range()`](/reference/time/#range) | Toutes les dates de `start` à `end`, bornes comprises, espacées d'une unité. |
| [`stopwatch()`](/reference/time/#stopwatch) | Démarre un chronomètre précis. |
| [`measure()`](/reference/time/#measure) | Exécute une fonction, synchrone ou asynchrone, et vous dit combien de temps elle a pris. |
| [`every()`](/reference/time/#every) | Exécute une tâche à intervalle régulier. |
| [`nextRun()`](/reference/time/#nextrun) | La prochaine date qui correspond à une expression cron, sans rien planifier. |
| [`cron()`](/reference/time/#cron) | Exécute une tâche selon une planification cron, dans n'importe quel fuseau horaire. |

### nc.id

Identifiants uniques : UUID v4, v5 et v7, ULID, ObjectId, identifiants façon nanoid, Snowflakes, tokens et codes courts. [Référence](/reference/id/) • [Guide](/data/id/)

| Nom | Rôle |
| --- | --- |
| [`uuid()`](/reference/id/#uuid) | Un UUID aléatoire (version 4). |
| [`uuidv5()`](/reference/id/#uuidv5) | Un UUID v5 : le même nom dans le même espace de noms donne toujours le même identifiant. |
| [`uuidv7()`](/reference/id/#uuidv7) | Un UUID v7 : il commence par un horodatage, donc les identifiants se trient par date de création. |
| [`ulid()`](/reference/id/#ulid) | Un ULID : 26 caractères compatibles avec les URL, qui se trient par date de création. |
| [`objectId()`](/reference/id/#objectid) | Un ObjectId façon MongoDB : 24 caractères hexadécimaux qui commencent par l'heure, en secondes, et augmentent au sein du processus. |
| [`nano()`](/reference/id/#nano) | Un identifiant aléatoire court et compatible avec les URL, comme `nanoid`. |
| [`customAlphabet()`](/reference/id/#customalphabet) | Crée un générateur d'identifiants avec votre propre alphabet et votre propre longueur. |
| [`prefixed()`](/reference/id/#prefixed) | Un identifiant aléatoire avec un préfixe qui dit ce qu'il identifie, comme les `cus_...` et `sub_...` de Stripe. |
| [`token()`](/reference/id/#token) | Un token aléatoire pour les clés d'API, les identifiants de session, les liens de réinitialisation... |
| [`code()`](/reference/id/#code) | Un code court, facile à lire à voix haute et à saisir : pas de confusion `0/O` ni `1/I/L`. |
| [`snowflake()`](/reference/id/#snowflake) | Un identifiant Snowflake, le format 64 bits utilisé par Discord et Twitter. |
| [`parseSnowflake()`](/reference/id/#parsesnowflake) | Décode un Snowflake. |
| [`timestamp()`](/reference/id/#timestamp) | Date de création d'un UUID v7, d'un ULID ou d'un ObjectId. |
| [`seq()`](/reference/id/#seq) | Des identifiants séquentiels lisibles comme `"user-1"`, `"user-2"`, comptés par préfixe. |
| [`hash()`](/reference/id/#hash) | Obsolète. Calcule le hash d'une valeur. |
| [`hmac()`](/reference/id/#hmac) | Obsolète. Signe une valeur avec HMAC. |
| [`safeEqual()`](/reference/id/#safeequal) | Obsolète. Compare deux secrets en temps constant. |

### nc.schema

Validez des données avec des schémas, dans l'esprit de `zod`. [Référence](/reference/schema/) • [Guide](/data/schema/)

| Nom | Rôle |
| --- | --- |
| [`string()`](/reference/schema/#string) | Un schéma de chaîne. |
| [`number()`](/reference/schema/#number) | Un nombre. |
| [`boolean()`](/reference/schema/#boolean) | Un schéma de booléen. |
| [`bigint()`](/reference/schema/#bigint) | Un schéma de bigint. |
| [`date()`](/reference/schema/#date) | Une `Date` valide. |
| [`literal()`](/reference/schema/#literal) | Exactement cette valeur. |
| [`enum()`](/reference/schema/#enum) | L'une de ces valeurs. |
| [`array()`](/reference/schema/#array) | Un tableau dont tous les éléments correspondent à `item`. |
| [`object()`](/reference/schema/#object) | Un objet aux clés connues. |
| [`union()`](/reference/schema/#union) | Correspond à l'un de ces schémas ; le premier qui convient l'emporte. |
| [`discriminatedUnion()`](/reference/schema/#discriminatedunion) | Une union d'objets distingués par une clé, comme le `type` d'un événement. |
| [`tuple()`](/reference/schema/#tuple) | Un tableau de longueur fixe avec un schéma par position. |
| [`record()`](/reference/schema/#record) | Un objet aux clés quelconques dont les valeurs correspondent à un schéma, comme un dictionnaire. |
| [`lazy()`](/reference/schema/#lazy) | Un schéma défini plus tard, pour les données récursives comme les arbres. |
| [`instanceOf()`](/reference/schema/#instanceof) | Une instance d'une classe. |
| [`custom()`](/reference/schema/#custom) | Un schéma à partir de n'importe quel test, en général une garde de type. |
| [`any()`](/reference/schema/#any) | N'importe quoi, typé `any`. |
| [`unknown()`](/reference/schema/#unknown) | N'importe quoi, typé `unknown`. |
| [`coerce`](/reference/schema/#coerce) | Des schémas qui convertissent leur entrée avant de la vérifier. |
| [`Schema`](/reference/schema/#schema) | La base de tous les schémas. |

## Fonctions et asynchrone

### nc.func

Utilitaires pour les fonctions : debounce, throttle, mémoïsation, nouvelles tentatives avec backoff, timeouts, gestion des erreurs sans try/catch et composition typée. [Référence](/reference/func/) • [Guide](/flow/func/)

| Nom | Rôle |
| --- | --- |
| [`debounce()`](/reference/func/#debounce) | Attend une pause de `wait` ms entre les appels, puis s'exécute une seule fois avec les derniers arguments. |
| [`throttle()`](/reference/func/#throttle) | S'exécute au plus une fois toutes les `interval` ms, quel que soit le nombre d'appels. |
| [`once()`](/reference/func/#once) | Exécute `fn` la première fois seulement ; les appels suivants renvoient le même résultat. |
| [`memoize()`](/reference/func/#memoize) | Met les résultats en cache selon les arguments. |
| [`retry()`](/reference/func/#retry) | Appelle `fn` jusqu'à ce qu'elle réussisse, en attendant entre les tentatives. |
| [`timeout()`](/reference/func/#timeout) | Rejette avec une `TimeoutError` si la promesse prend plus de `ms`. |
| [`delay()`](/reference/func/#delay) | Attend `ms`, puis appelle `fn` avec les arguments et résout avec son résultat. |
| [`to()`](/reference/func/#to) | Attend une promesse et vous donne `[error, value]` au lieu de lever une erreur : plus besoin de try/catch. |
| [`attempt()`](/reference/func/#attempt) | Enveloppe une fonction pour qu'elle résolve avec `[error, value]` au lieu de lever une erreur. |
| [`promisify()`](/reference/func/#promisify) | Transforme une fonction à callback en une fonction qui renvoie une promesse. |
| [`batch()`](/reference/func/#batch) | Transforme de nombreux appels unitaires en quelques appels groupés. |
| [`dedupe()`](/reference/func/#dedupe) | Fait partager une seule exécution aux appels simultanés qui ont les mêmes arguments. |
| [`pipe()`](/reference/func/#pipe) | Enchaîne des fonctions de gauche à droite : `pipe(f, g)(x)` vaut `g(f(x))`. |
| [`pipeAsync()`](/reference/func/#pipeasync) | Comme `pipe()`, pour des fonctions qui peuvent être asynchrones : chacune est attendue avant que la suivante s'exécute. |
| [`compose()`](/reference/func/#compose) | Enchaîne des fonctions de droite à gauche : `compose(f, g)(x)` vaut `f(g(x))`. |
| [`curry()`](/reference/func/#curry) | Permet de passer les arguments d'une fonction quelques-uns à la fois. |
| [`partial()`](/reference/func/#partial) | Fixe les premiers arguments d'une fonction. |
| [`negate()`](/reference/func/#negate) | L'inverse d'un prédicat. |
| [`after()`](/reference/func/#after) | Ne fait rien pendant les `n - 1` premiers appels, puis appelle `fn` à chaque fois. |
| [`before()`](/reference/func/#before) | Appelle `fn` pendant les `n - 1` premiers appels, puis renvoie toujours le dernier résultat. |
| [`noop()`](/reference/func/#noop) | Ne fait rien. |
| [`identity()`](/reference/func/#identity) | Renvoie son argument. |

### nc.async

Promesses et concurrence : map avec une limite, files d'attente avec priorités, mutex, polling, et un `Promise.allSettled` plus agréable. [Référence](/reference/async/) • [Guide](/flow/async/)

| Nom | Rôle |
| --- | --- |
| [`sleep()`](/reference/async/#sleep) | Attend un moment. |
| [`map()`](/reference/async/#map) | Fait passer des éléments dans une fonction asynchrone, avec au plus `concurrency` appels à la fois. |
| [`forEach()`](/reference/async/#foreach) | Exécute une fonction asynchrone pour chaque élément, avec une limite de concurrence. |
| [`filter()`](/reference/async/#filter) | Garde les éléments qui passent un test asynchrone, avec une limite de concurrence. |
| [`series()`](/reference/async/#series) | Exécute des fonctions asynchrones l'une après l'autre et renvoie leurs résultats. |
| [`parallel()`](/reference/async/#parallel) | Exécute des fonctions asynchrones en même temps, ou quelques-unes à la fois avec `concurrency`, et renvoie leurs résultats dans l'ordre. |
| [`limit()`](/reference/async/#limit) | Un limiteur : enveloppez vos appels avec, et au plus `concurrency` s'exécutent à la fois pendant que les autres attendent leur tour. |
| [`rateLimit()`](/reference/async/#ratelimit) | Un limiteur de débit : au plus `max` appels démarrent dans n'importe quel `interval`. |
| [`queue()`](/reference/async/#queue) | Une file d'attente de tâches avec une limite de concurrence, des priorités, une pause et des timeouts par tâche. |
| [`mutex()`](/reference/async/#mutex) | Un mutex : les tâches confiées à `run()` ne se chevauchent jamais. |
| [`deferred()`](/reference/async/#deferred) | Une promesse accompagnée de ses `resolve` et `reject`. |
| [`settle()`](/reference/async/#settle) | Attend toutes les promesses et sépare les succès des échecs. |
| [`props()`](/reference/async/#props) | Comme `Promise.all`, pour un objet de promesses. |
| [`poll()`](/reference/async/#poll) | Appelle `fn` jusqu'à ce qu'elle renvoie une valeur truthy, et résout avec celle-ci. |
| [`abortable()`](/reference/async/#abortable) | Fait abandonner n'importe quelle promesse quand un signal se déclenche. |
| [`retry()`](/reference/async/#retry) | Appelle `fn` jusqu'à ce qu'elle réussisse, en attendant entre les tentatives. |
| [`timeout()`](/reference/async/#timeout) | Rejette avec une `TimeoutError` si la promesse prend plus de `ms`. |

### Cache

Un cache en mémoire avec une limite de taille (les entrées les moins récemment utilisées partent en premier), une expiration par entrée et des statistiques. [Référence](/reference/cache/) • [Guide](/flow/cache/)

| Nom | Rôle |
| --- | --- |
| [`new Cache()`](/reference/cache/#constructor) |  |
| [`get()`](/reference/cache/#get) | Lit une valeur et la marque comme récemment utilisée. |
| [`peek()`](/reference/cache/#peek) | Lit une valeur sans la compter comme une utilisation ni toucher aux statistiques. |
| [`set()`](/reference/cache/#set) | Stocke une valeur. |
| [`getOrSet()`](/reference/cache/#getorset) | Renvoie la valeur en cache, ou appelle `loader`, stocke le résultat et le renvoie. |
| [`has()`](/reference/cache/#has) | Y a-t-il une entrée fraîche pour cette clé ? |
| [`delete()`](/reference/cache/#delete) | Supprime une entrée. |
| [`clear()`](/reference/cache/#clear) | Supprime toutes les entrées. |
| [`prune()`](/reference/cache/#prune) | Supprime les entrées expirées maintenant, sans attendre qu'elles soient lues. |
| [`ttl()`](/reference/cache/#ttl) | Temps restant avant l'expiration d'une entrée. |
| [`wrap()`](/reference/cache/#wrap) | Enveloppe une fonction pour que ses résultats soient mis en cache ici. |
| [`size`](/reference/cache/#size) | Nombre d'entrées, y compris celles qui ont expiré mais ne sont pas encore supprimées. |
| [`stats`](/reference/cache/#stats) | Nombre de hits et de miss. |
| [`resetStats()`](/reference/cache/#resetstats) | Remet à zéro tous les compteurs de `stats`. |
| [`keys()`](/reference/cache/#keys) | Les clés fraîches, la moins récemment utilisée en premier. |
| [`values()`](/reference/cache/#values) | Les valeurs fraîches, la moins récemment utilisée en premier. |
| [`entries()`](/reference/cache/#entries) | Les paires `[key, value]` fraîches, la moins récemment utilisée en premier. |

### Emitter

Un petit émetteur d'événements typé. [Référence](/reference/emitter/) • [Guide](/flow/emitter/)

| Nom | Rôle |
| --- | --- |
| [`new Emitter()`](/reference/emitter/#constructor) |  |
| [`on()`](/reference/emitter/#on) | Écoute un événement. |
| [`once()`](/reference/emitter/#once) | Écoute un événement une seule fois. |
| [`onAny()`](/reference/emitter/#onany) | Écoute tous les événements ; l'écouteur reçoit d'abord le nom de l'événement. |
| [`off()`](/reference/emitter/#off) | Retire un écouteur, ou tous les écouteurs de l'événement si vous n'en passez pas. |
| [`emit()`](/reference/emitter/#emit) | Appelle tout de suite les écouteurs de l'événement, dans l'ordre où ils ont été ajoutés. |
| [`emitAsync()`](/reference/emitter/#emitasync) | Appelle les écouteurs un par un, en attendant chacun, et résout avec ce qu'ils ont renvoyé. |
| [`waitFor()`](/reference/emitter/#waitfor) | Attend le prochain déclenchement de l'événement et résout avec ses arguments. |
| [`iterate()`](/reference/emitter/#iterate) | Parcourt un événement avec `for await`. |
| [`listenerCount()`](/reference/emitter/#listenercount) | Nombre d'écouteurs d'un événement, ou de tous les événements réunis. |
| [`listeners()`](/reference/emitter/#listeners) | Les écouteurs d'un événement, dans l'ordre où ils s'exécutent. |
| [`eventNames()`](/reference/emitter/#eventnames) | Les événements qui ont des écouteurs. |
| [`clear()`](/reference/emitter/#clear) | Retire tous les écouteurs d'un événement, ou tout si vous n'en nommez aucun. |

## Système et réseau

### nc.http

Un client HTTP construit sur `fetch` : JSON par défaut, objets pour la chaîne de requête, URL de base, timeouts, nouvelles tentatives sûres qui respectent `Retry-After`, erreurs typées, hooks, clients réutilisables et téléchargements avec progression. [Référence](/reference/http/) • [Guide](/system/http/)

| Nom | Rôle |
| --- | --- |
| [`request()`](/reference/http/#request) | Envoie une requête et se résout avec la réponse, corps déjà lu. |
| [`get()`](/reference/http/#get) | Envoie une requête GET. |
| [`head()`](/reference/http/#head) | Envoie une requête HEAD : les en-têtes seulement, sans corps. |
| [`post()`](/reference/http/#post) | Envoie une requête POST. |
| [`put()`](/reference/http/#put) | Envoie une requête PUT. |
| [`patch()`](/reference/http/#patch) | Envoie une requête PATCH. |
| [`delete()`](/reference/http/#delete) | Envoie une requête DELETE. |
| [`download()`](/reference/http/#download) | Télécharge vers un fichier en stream, la mémoire reste donc stable quelle que soit la taille. |
| [`create()`](/reference/http/#create) | Crée un client avec des options par défaut. |
| [`HttpError`](/reference/http/#httperror) | Levée par `nc.http` quand le statut de la réponse n'est pas 2xx (sauf si vous passez `throwHttpErrors: false`), et pour les échecs réseau (`status` 0). |

### SQLite

SQLite rendu agréable, sur le moteur intégré à Node.js (22.13+) : CRUD avec des filtres riches, colonnes JSON et booléennes, transactions, migrations et sauvegardes. [Référence](/reference/sqlite/) • [Guide](/system/sqlite/)

| Nom | Rôle |
| --- | --- |
| [`new SQLite()`](/reference/sqlite/#constructor) | Ouvre une base de données, en créant le fichier et ses dossiers si nécessaire. |
| [`exec()`](/reference/sqlite/#exec) | Exécute du SQL qui ne renvoie pas de lignes. |
| [`queryOne()`](/reference/sqlite/#queryone) | Exécute une requête et renvoie la première ligne. |
| [`queryAll()`](/reference/sqlite/#queryall) | Exécute une requête et renvoie toutes les lignes. |
| [`iterate()`](/reference/sqlite/#iterate) | Parcourt les lignes d'une requête une à une, sans les charger toutes. |
| [`createTable()`](/reference/sqlite/#createtable) | Crée une table avec ses contraintes et ses index, sauf si elle existe déjà. |
| [`createIndex()`](/reference/sqlite/#createindex) | Crée un index, sauf s'il existe déjà. |
| [`deleteTable()`](/reference/sqlite/#deletetable) | Supprime une table et tout ce qu'elle contient. |
| [`clearTable()`](/reference/sqlite/#cleartable) | Supprime toutes les lignes, en conservant la table. |
| [`hasTable()`](/reference/sqlite/#hastable) | La table existe-t-elle ? |
| [`tables()`](/reference/sqlite/#tables) | Les tables de la base de données, triées. |
| [`columns()`](/reference/sqlite/#columns) | Les colonnes d'une table. |
| [`get()`](/reference/sqlite/#get) | La première ligne qui correspond. |
| [`getAll()`](/reference/sqlite/#getall) | Les lignes qui correspondent, avec tri et pagination. |
| [`paginate()`](/reference/sqlite/#paginate) | Une page des lignes qui correspondent, avec ce dont un composant de pagination a besoin pour s'afficher. |
| [`count()`](/reference/sqlite/#count) | Compte les lignes qui correspondent. |
| [`exists()`](/reference/sqlite/#exists) | Au moins une ligne correspond-elle ? |
| [`insert()`](/reference/sqlite/#insert) | Insère une ligne. |
| [`insertMany()`](/reference/sqlite/#insertmany) | Insère de nombreuses lignes en une seule transaction : tout ou rien, et bien plus rapide qu'une par une. |
| [`update()`](/reference/sqlite/#update) | Met à jour les lignes qui correspondent. |
| [`upsert()`](/reference/sqlite/#upsert) | Insère une ligne, ou la met à jour sur place si elle entre en conflit avec une ligne existante sur les colonnes `conflict`. |
| [`set()`](/reference/sqlite/#set) | Met à jour la ligne correspondant à `where` (ou `{ id: data.id }`), ou l'insère. |
| [`delete()`](/reference/sqlite/#delete) | Supprime les lignes qui correspondent. |
| [`increment()`](/reference/sqlite/#increment) | Ajoute aux colonnes numériques en une seule instruction, deux requêtes simultanées comptent donc toutes les deux. |
| [`table()`](/reference/sqlite/#table) | Des raccourcis liés à une table, pour ne pas répéter son nom. |
| [`transaction()`](/reference/sqlite/#transaction) | Exécute `callback` dans une transaction : toutes ses modifications sont enregistrées ensemble, ou aucune s'il lève une erreur. |
| [`inTransaction`](/reference/sqlite/#intransaction) | Indique si une transaction est ouverte. |
| [`migrate()`](/reference/sqlite/#migrate) | Applique les migrations dans l'ordre, chacune une seule fois. |
| [`version`](/reference/sqlite/#version) | La version des migrations, stockée dans `PRAGMA user_version`. |
| [`backup()`](/reference/sqlite/#backup) | Copie la base de données dans un nouveau fichier. |
| [`vacuum()`](/reference/sqlite/#vacuum) | Compacte le fichier de la base de données pour récupérer l'espace inutilisé. |
| [`fn()`](/reference/sqlite/#fn) | Rend une fonction JavaScript appelable depuis SQL. |
| [`path`](/reference/sqlite/#path) | Le chemin absolu du fichier de la base de données, ou `":memory:"`. |
| [`isOpen`](/reference/sqlite/#isopen) | Indique si la connexion est ouverte. |
| [`native`](/reference/sqlite/#native) | La base de données `node:sqlite` sous-jacente, pour tout ce qui n'est pas couvert ici. |
| [`close()`](/reference/sqlite/#close) | Ferme la connexion. |

### nc.cli

Ce qu'il vous faut pour les outils en ligne de commande : des arguments typés avec un `--help` généré, des questions, des menus pilotés aux flèches, des spinners, des barres de progression, des tableaux et des cadres. [Référence](/reference/cli/) • [Guide](/system/cli/)

| Nom | Rôle |
| --- | --- |
| [`table()`](/reference/cli/#table) | Dessine un tableau à partir d'un tableau d'objets (les clés deviennent les colonnes) ou d'un tableau de tableaux. |
| [`box()`](/reference/cli/#box) | Dessine un cadre autour d'un texte. |
| [`tree()`](/reference/cli/#tree) | Dessine des données imbriquées sous forme d'arbre, comme la commande `tree` le fait pour les dossiers. |
| [`spinner()`](/reference/cli/#spinner) | Un spinner pour un travail en cours. |
| [`spin()`](/reference/cli/#spin) | Affiche un spinner pendant qu'un travail s'exécute, puis `✔` ou `✖` selon la façon dont il s'est terminé. |
| [`progress()`](/reference/cli/#progress) | Une barre de progression avec pourcentage, ETA et vitesse. |
| [`prompt()`](/reference/cli/#prompt) | Pose une question et renvoie la réponse. |
| [`password()`](/reference/cli/#password) | Demande un secret sans l'afficher ; chaque caractère apparaît sous la forme `*`. |
| [`confirm()`](/reference/cli/#confirm) | Pose une question oui/non. |
| [`select()`](/reference/cli/#select) | Laisse l'utilisateur sélectionner un choix avec les flèches et Entrée. |
| [`multiselect()`](/reference/cli/#multiselect) | Laisse l'utilisateur sélectionner plusieurs choix : les flèches pour se déplacer, Espace pour cocher ou décocher, `a` pour tout sélectionner, Entrée pour valider. |
| [`args()`](/reference/cli/#args) | Analyse les arguments de la ligne de commande à partir d'un schéma, et type le résultat : `flags.port` est un `number`. |
| [`isInteractive()`](/reference/cli/#isinteractive) | Y a-t-il quelqu'un au clavier ? |
| [`size()`](/reference/cli/#size) | La taille du terminal, ou 80x24 quand elle est inconnue. |
| [`clear()`](/reference/cli/#clear) | Efface l'écran. |

### nc.color

Des couleurs de terminal que vous pouvez chaîner, comme `chalk`. [Référence](/reference/color/) • [Guide](/system/color/)

| Nom | Rôle |
| --- | --- |
| [`level`](/reference/color/#level) | Le niveau de couleur actuel. |
| [`enabled`](/reference/color/#enabled) | Indique si les couleurs sont émises. |
| [`create()`](/reference/color/#create) | Une instance séparée avec son propre niveau, pour un autre flux ou pour les tests. |
| [`detect()`](/reference/color/#detect) | Le niveau de couleur pris en charge par un flux, en tenant compte de `NO_COLOR` et de `FORCE_COLOR`. |
| [`strip()`](/reference/color/#strip) | Retire les couleurs et les autres codes d'échappement du terminal. |
| [`width()`](/reference/color/#width) | Le nombre de colonnes occupées par le texte, sans tenir compte des couleurs et en comptant 2 pour les emoji et les caractères CJK. |
| [`truncate()`](/reference/color/#truncate) | Coupe le texte à un nombre de colonnes et ajoute `…`. |
| [`link()`](/reference/color/#link) | Un lien cliquable dans les terminaux qui le prennent en charge, `"text (url)"` ailleurs. |
| [`gradient()`](/reference/color/#gradient) | Colore le texte le long d'un dégradé de couleurs hexadécimales. |

### nc.sys

Les processus et le système : lancer des commandes et récupérer leur sortie, trouver des exécutables, s'arrêter proprement, ouvrir des URL et se renseigner sur la machine. [Référence](/reference/sys/) • [Guide](/system/sys/)

| Nom | Rôle |
| --- | --- |
| [`run()`](/reference/sys/#run) | Lance un programme sans shell : les arguments sont donc passés tels quels et une saisie d'utilisateur ne peut rien injecter. |
| [`exec()`](/reference/sys/#exec) | Lance une ligne de commande via le shell : les pipes, `&&` et les variables fonctionnent donc. |
| [`which()`](/reference/sys/#which) | Trouve un exécutable dans `PATH`, comme la commande `which`. |
| [`open()`](/reference/sys/#open) | Ouvre une URL, un fichier ou un dossier avec l'application par défaut. |
| [`onShutdown()`](/reference/sys/#onshutdown) | Exécute du code de nettoyage quand on demande au processus de s'arrêter (Ctrl+C, `docker stop`, `kill`) : fermer les serveurs, vider les logs, déconnecter les bases de données. |
| [`shutdown()`](/reference/sys/#shutdown) | Arrête le processus proprement : exécute les gestionnaires de `onShutdown()`, puis quitte. |
| [`freePort()`](/reference/sys/#freeport) | Trouve un port TCP sur lequel personne n'écoute. |
| [`localIP()`](/reference/sys/#localip) | L'adresse de cette machine sur le réseau local, comme `"192.168.1.20"`. |
| [`isWindows()`](/reference/sys/#iswindows) | Sommes-nous sous Windows ? |
| [`isMac()`](/reference/sys/#ismac) | Sommes-nous sous macOS ? |
| [`isLinux()`](/reference/sys/#islinux) | Sommes-nous sous Linux ? |
| [`isCI()`](/reference/sys/#isci) | Sommes-nous en CI ? |
| [`isDocker()`](/reference/sys/#isdocker) | Sommes-nous dans un conteneur ? |
| [`isWSL()`](/reference/sys/#iswsl) | Sommes-nous dans WSL ? |
| [`info()`](/reference/sys/#info) | Des informations sur la machine et l'environnement d'exécution, pratiques pour les rapports de bug. |
| [`memory()`](/reference/sys/#memory) | La mémoire utilisée par ce processus, en octets. |

### nc.crypto

La cryptographie sans les pièges, construite sur `node:crypto` : hashes, HMAC, hachage de mots de passe (scrypt), chiffrement (AES-256-GCM), JWT, codes à deux facteurs (TOTP) et valeurs aléatoires sûres. [Référence](/reference/crypto/) • [Guide](/system/crypto/)

| Nom | Rôle |
| --- | --- |
| [`hash()`](/reference/crypto/#hash) | Calcule le hash de données, en SHA-256 et en hexadécimal par défaut. |
| [`hmac()`](/reference/crypto/#hmac) | Une signature HMAC : un hash calculé avec un secret comme clé. |
| [`verifyHmac()`](/reference/crypto/#verifyhmac) | Vérifie, en temps constant, une signature HMAC que vous avez reçue. |
| [`safeEqual()`](/reference/crypto/#safeequal) | Compare deux secrets en temps constant : la comparaison ne peut donc rien laisser fuiter par sa durée, pas même leurs longueurs. |
| [`hashPassword()`](/reference/crypto/#hashpassword) | Calcule le hash d'un mot de passe avec scrypt et un sel aléatoire. |
| [`verifyPassword()`](/reference/crypto/#verifypassword) | Vérifie un mot de passe par rapport à un hash stocké, en temps constant. |
| [`needsRehash()`](/reference/crypto/#needsrehash) | Ce hash a-t-il été créé avec des paramètres plus faibles que les vôtres ? |
| [`generateKey()`](/reference/crypto/#generatekey) | Une clé aléatoire de 256 bits pour `encrypt()`, sous forme de texte que vous pouvez placer dans une variable d'environnement. |
| [`encrypt()`](/reference/crypto/#encrypt) | Chiffre des données avec AES-256-GCM, qui détecte aussi les altérations. |
| [`decrypt()`](/reference/crypto/#decrypt) | Déchiffre ce que `encrypt()` a produit. |
| [`signJWT()`](/reference/crypto/#signjwt) | Crée un JSON Web Token signé. |
| [`decodeJWT()`](/reference/crypto/#decodejwt) | Lit un JWT sans le vérifier. |
| [`verifyJWT()`](/reference/crypto/#verifyjwt) | Vérifie un JWT : algorithme, signature, expiration et les claims que vous exigez. |
| [`generateKeyPair()`](/reference/crypto/#generatekeypair) | Crée une paire de clés pour signer des JWT : la clé privée signe, la clé publique vérifie. |
| [`totpSecret()`](/reference/crypto/#totpsecret) | Un nouveau secret à deux facteurs, au format Base32 attendu par les applications d'authentification. |
| [`totp()`](/reference/crypto/#totp) | Le code à 6 chiffres en cours pour un secret à deux facteurs, tel que l'affichent les applications d'authentification. |
| [`verifyTOTP()`](/reference/crypto/#verifytotp) | Vérifie un code saisi par un utilisateur. |
| [`totpURI()`](/reference/crypto/#totpuri) | Le lien `otpauth://` à afficher sous forme de QR code quand un utilisateur active la 2FA. |
| [`randomBytes()`](/reference/crypto/#randombytes) | Des octets aléatoires sûrs. |
| [`randomInt()`](/reference/crypto/#randomint) | Un entier aléatoire sûr de `min` à `max`, bornes incluses, sans biais. |
| [`toBase64()`](/reference/crypto/#tobase64) | Encode en Base64, ou en Base64 adapté aux URL. |
| [`fromBase64()`](/reference/crypto/#frombase64) | Décode du Base64 ou du Base64 adapté aux URL. |
