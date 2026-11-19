"use strict";

/**
 * The checks of node-comfort 2, under their old names. Deprecated: use
 * `nc.is` (`nc.isEmail()` is now `nc.is.email()`) and `nc.assert`. Each
 * name warns once when it is used, and they will be removed in 4.0.
 *
 * @example
 * nc.is.email("a@b.co"); // instead of nc.checker.isEmail("a@b.co")
 */

const is = require("./Is.js");
const assertModule = require("./Assert.js");
const { deprecate } = require("./internal/deprecate.js");

/**
 * @deprecated Use `nc.is.array()`. It will be removed in 4.0.
 * @type {(typeof is)["array"]}
 */
const isArray = is.array;

/**
 * @deprecated Use `nc.is.number()`. It will be removed in 4.0.
 * @type {(typeof is)["number"]}
 */
const isNumber = is.number;

/**
 * @deprecated Use `nc.is.finite()`. It will be removed in 4.0.
 * @type {(typeof is)["finite"]}
 */
const isFinite = is.finite;

/**
 * @deprecated Use `nc.is.integer()`. It will be removed in 4.0.
 * @type {(typeof is)["integer"]}
 */
const isInteger = is.integer;

/**
 * @deprecated Use `nc.is.safeInteger()`. It will be removed in 4.0.
 * @type {(typeof is)["safeInteger"]}
 */
const isSafeInteger = is.safeInteger;

/**
 * @deprecated Use `nc.is.float()`. It will be removed in 4.0.
 * @type {(typeof is)["float"]}
 */
const isFloat = is.float;

/**
 * @deprecated Use `nc.is.positive()`. It will be removed in 4.0.
 * @type {(typeof is)["positive"]}
 */
const isPositive = is.positive;

/**
 * @deprecated Use `nc.is.negative()`. It will be removed in 4.0.
 * @type {(typeof is)["negative"]}
 */
const isNegative = is.negative;

/**
 * @deprecated Use `nc.is.boolean()`. It will be removed in 4.0.
 * @type {(typeof is)["boolean"]}
 */
const isBoolean = is.boolean;

/**
 * @deprecated Use `nc.is.string()`. It will be removed in 4.0.
 * @type {(typeof is)["string"]}
 */
const isString = is.string;

/**
 * @deprecated Use `nc.is.symbol()`. It will be removed in 4.0.
 * @type {(typeof is)["symbol"]}
 */
const isSymbol = is.symbol;

/**
 * @deprecated Use `nc.is.bigInt()`. It will be removed in 4.0.
 * @type {(typeof is)["bigInt"]}
 */
const isBigInt = is.bigInt;

/**
 * @deprecated Use `nc.is.undefined()`. It will be removed in 4.0.
 * @type {(typeof is)["undefined"]}
 */
const isUndefined = is.undefined;

/**
 * @deprecated Use `nc.is.null()`. It will be removed in 4.0.
 * @type {(typeof is)["null"]}
 */
const isNull = is.null;

/**
 * @deprecated Use `nc.is.nil()`. It will be removed in 4.0.
 * @type {(typeof is)["nil"]}
 */
const isNil = is.nil;

/**
 * @deprecated Use `nc.is.defined()`. It will be removed in 4.0.
 * @type {(typeof is)["defined"]}
 */
const isDefined = is.defined;

/**
 * @deprecated Use `nc.is.primitive()`. It will be removed in 4.0.
 * @type {(typeof is)["primitive"]}
 */
const isPrimitive = is.primitive;

/**
 * @deprecated Use `nc.is.function()`. It will be removed in 4.0.
 * @type {(typeof is)["function"]}
 */
const isFunction = is.function;

/**
 * @deprecated Use `nc.is.asyncFunction()`. It will be removed in 4.0.
 * @type {(typeof is)["asyncFunction"]}
 */
const isAsyncFunction = is.asyncFunction;

/**
 * @deprecated Use `nc.is.generatorFunction()`. It will be removed in 4.0.
 * @type {(typeof is)["generatorFunction"]}
 */
const isGeneratorFunction = is.generatorFunction;

/**
 * @deprecated Use `nc.is.generator()`. It will be removed in 4.0.
 * @type {(typeof is)["generator"]}
 */
const isGenerator = is.generator;

/**
 * @deprecated Use `nc.is.class()`. It will be removed in 4.0.
 * @type {(typeof is)["class"]}
 */
const isClass = is.class;

/**
 * @deprecated Use `nc.is.object()`. It will be removed in 4.0.
 * @type {(typeof is)["object"]}
 */
const isObject = is.object;

/**
 * @deprecated Use `nc.is.plainObject()`. It will be removed in 4.0.
 * @type {(typeof is)["plainObject"]}
 */
const isPlainObject = is.plainObject;

/**
 * @deprecated Use `nc.is.promise()`. It will be removed in 4.0.
 * @type {(typeof is)["promise"]}
 */
const isPromise = is.promise;

/**
 * @deprecated Use `nc.is.regExp()`. It will be removed in 4.0.
 * @type {(typeof is)["regExp"]}
 */
const isRegExp = is.regExp;

/**
 * @deprecated Use `nc.is.date()`. It will be removed in 4.0.
 * @type {(typeof is)["date"]}
 */
const isDate = is.date;

/**
 * @deprecated Use `nc.is.validDate()`. It will be removed in 4.0.
 * @type {(typeof is)["validDate"]}
 */
const isValidDate = is.validDate;

/**
 * @deprecated Use `nc.is.map()`. It will be removed in 4.0.
 * @type {(typeof is)["map"]}
 */
const isMap = is.map;

/**
 * @deprecated Use `nc.is.set()`. It will be removed in 4.0.
 * @type {(typeof is)["set"]}
 */
const isSet = is.set;

/**
 * @deprecated Use `nc.is.weakMap()`. It will be removed in 4.0.
 * @type {(typeof is)["weakMap"]}
 */
const isWeakMap = is.weakMap;

/**
 * @deprecated Use `nc.is.weakSet()`. It will be removed in 4.0.
 * @type {(typeof is)["weakSet"]}
 */
const isWeakSet = is.weakSet;

/**
 * @deprecated Use `nc.is.iterable()`. It will be removed in 4.0.
 * @type {(typeof is)["iterable"]}
 */
const isIterable = is.iterable;

/**
 * @deprecated Use `nc.is.asyncIterable()`. It will be removed in 4.0.
 * @type {(typeof is)["asyncIterable"]}
 */
const isAsyncIterable = is.asyncIterable;

/**
 * @deprecated Use `nc.is.buffer()`. It will be removed in 4.0.
 * @type {(typeof is)["buffer"]}
 */
const isBuffer = is.buffer;

/**
 * @deprecated Use `nc.is.typedArray()`. It will be removed in 4.0.
 * @type {(typeof is)["typedArray"]}
 */
const isTypedArray = is.typedArray;

/**
 * @deprecated Use `nc.is.error()`. It will be removed in 4.0.
 * @type {(typeof is)["error"]}
 */
const isError = is.error;

/**
 * @deprecated Use `nc.is.empty()`. It will be removed in 4.0.
 * @type {(typeof is)["empty"]}
 */
const isEmpty = is.empty;

/**
 * @deprecated Use `nc.is.blank()`. It will be removed in 4.0.
 * @type {(typeof is)["blank"]}
 */
const isBlank = is.blank;

/**
 * @deprecated Use `nc.is.arrayOf()`. It will be removed in 4.0.
 * @type {(typeof is)["arrayOf"]}
 */
const isArrayOf = is.arrayOf;

/**
 * @deprecated Use `nc.is.oneOf()`. It will be removed in 4.0.
 * @type {(typeof is)["oneOf"]}
 */
const isOneOf = is.oneOf;

/**
 * @deprecated Use `nc.is.email()`. It will be removed in 4.0.
 * @type {(typeof is)["email"]}
 */
const isEmail = is.email;

/**
 * @deprecated Use `nc.is.url()`. It will be removed in 4.0.
 * @type {(typeof is)["url"]}
 */
const isURL = is.url;

/**
 * @deprecated Use `nc.is.uuid()`. It will be removed in 4.0.
 * @type {(typeof is)["uuid"]}
 */
const isUUID = is.uuid;

/**
 * @deprecated Use `nc.is.json()`. It will be removed in 4.0.
 * @type {(typeof is)["json"]}
 */
const isJSON = is.json;

/**
 * @deprecated Use `nc.is.numeric()`. It will be removed in 4.0.
 * @type {(typeof is)["numeric"]}
 */
const isNumeric = is.numeric;

/**
 * @deprecated Use `nc.is.ip()`. It will be removed in 4.0.
 * @type {(typeof is)["ip"]}
 */
const isIP = is.ip;

/**
 * @deprecated Use `nc.is.ipv4()`. It will be removed in 4.0.
 * @type {(typeof is)["ipv4"]}
 */
const isIPv4 = is.ipv4;

/**
 * @deprecated Use `nc.is.ipv6()`. It will be removed in 4.0.
 * @type {(typeof is)["ipv6"]}
 */
const isIPv6 = is.ipv6;

/**
 * @deprecated Use `nc.is.port()`. It will be removed in 4.0.
 * @type {(typeof is)["port"]}
 */
const isPort = is.port;

/**
 * @deprecated Use `nc.is.hex()`. It will be removed in 4.0.
 * @type {(typeof is)["hex"]}
 */
const isHex = is.hex;

/**
 * @deprecated Use `nc.is.hexColor()`. It will be removed in 4.0.
 * @type {(typeof is)["hexColor"]}
 */
const isHexColor = is.hexColor;

/**
 * @deprecated Use `nc.is.base64()`. It will be removed in 4.0.
 * @type {(typeof is)["base64"]}
 */
const isBase64 = is.base64;

/**
 * @deprecated Use `nc.is.semver()`. It will be removed in 4.0.
 * @type {(typeof is)["semver"]}
 */
const isSemver = is.semver;

/**
 * @deprecated Use `nc.is.isoDate()`. It will be removed in 4.0.
 * @type {(typeof is)["isoDate"]}
 */
const isISODate = is.isoDate;

/**
 * @deprecated Use `nc.is.slug()`. It will be removed in 4.0.
 * @type {(typeof is)["slug"]}
 */
const isSlug = is.slug;

/**
 * @deprecated Use `nc.is.alpha()`. It will be removed in 4.0.
 * @type {(typeof is)["alpha"]}
 */
const isAlpha = is.alpha;

/**
 * @deprecated Use `nc.is.alphanumeric()`. It will be removed in 4.0.
 * @type {(typeof is)["alphanumeric"]}
 */
const isAlphanumeric = is.alphanumeric;

/**
 * @deprecated Use `nc.is.creditCard()`. It will be removed in 4.0.
 * @type {(typeof is)["creditCard"]}
 */
const isCreditCard = is.creditCard;

/**
 * @deprecated Use `nc.is.jwt()`. It will be removed in 4.0.
 * @type {(typeof is)["jwt"]}
 */
const isJWT = is.jwt;

/**
 * @deprecated Use `nc.is.hostname()`. It will be removed in 4.0.
 * @type {(typeof is)["hostname"]}
 */
const isHostname = is.hostname;

/**
 * @deprecated Use `nc.is.macAddress()`. It will be removed in 4.0.
 * @type {(typeof is)["macAddress"]}
 */
const isMACAddress = is.macAddress;

/**
 * @deprecated Use `nc.is.iban()`. It will be removed in 4.0.
 * @type {(typeof is)["iban"]}
 */
const isIBAN = is.iban;

/**
 * @deprecated Use `nc.is.e164()`. It will be removed in 4.0.
 * @type {(typeof is)["e164"]}
 */
const isE164 = is.e164;

/**
 * @deprecated Use `nc.is.objectId()`. It will be removed in 4.0.
 * @type {(typeof is)["objectId"]}
 */
const isObjectId = is.objectId;

/**
 * @deprecated Use `nc.is.ulid()`. It will be removed in 4.0.
 * @type {(typeof is)["ulid"]}
 */
const isULID = is.ulid;

/**
 * @deprecated Use `nc.is.dataUrl()`. It will be removed in 4.0.
 * @type {(typeof is)["dataUrl"]}
 */
const isDataURL = is.dataUrl;

/**
 * @deprecated Use `nc.is.mimeType()`. It will be removed in 4.0.
 * @type {(typeof is)["mimeType"]}
 */
const isMimeType = is.mimeType;

/**
 * @deprecated Use `nc.is.timeZone()`. It will be removed in 4.0.
 * @type {(typeof is)["timeZone"]}
 */
const isTimeZone = is.timeZone;

/**
 * @deprecated Use `nc.is.locale()`. It will be removed in 4.0.
 * @type {(typeof is)["locale"]}
 */
const isLocale = is.locale;

/**
 * @deprecated Use `nc.is.cron()`. It will be removed in 4.0.
 * @type {(typeof is)["cron"]}
 */
const isCron = is.cron;

/**
 * @deprecated Use `nc.is.ascii()`. It will be removed in 4.0.
 * @type {(typeof is)["ascii"]}
 */
const isASCII = is.ascii;

/**
 * @deprecated Use `nc.assert()`. It will be removed in 4.0.
 * @type {typeof assertModule}
 */
const assert = assertModule;

/**
 * @deprecated Use `nc.assert.type()`. It will be removed in 4.0.
 * @type {typeof assertModule.type}
 */
const assertType = assertModule.type;

module.exports = {
  isArray,
  isNumber,
  isFinite,
  isInteger,
  isSafeInteger,
  isFloat,
  isPositive,
  isNegative,
  isBoolean,
  isString,
  isSymbol,
  isBigInt,
  isUndefined,
  isNull,
  isNil,
  isDefined,
  isPrimitive,
  isFunction,
  isAsyncFunction,
  isGeneratorFunction,
  isGenerator,
  isClass,
  isObject,
  isPlainObject,
  isPromise,
  isRegExp,
  isDate,
  isValidDate,
  isMap,
  isSet,
  isWeakMap,
  isWeakSet,
  isIterable,
  isAsyncIterable,
  isBuffer,
  isTypedArray,
  isError,
  isEmpty,
  isBlank,
  isArrayOf,
  isOneOf,
  isEmail,
  isURL,
  isUUID,
  isJSON,
  isNumeric,
  isIP,
  isIPv4,
  isIPv6,
  isPort,
  isHex,
  isHexColor,
  isBase64,
  isSemver,
  isISODate,
  isSlug,
  isAlpha,
  isAlphanumeric,
  isCreditCard,
  isJWT,
  isHostname,
  isMACAddress,
  isIBAN,
  isE164,
  isObjectId,
  isULID,
  isDataURL,
  isMimeType,
  isTimeZone,
  isLocale,
  isCron,
  isASCII,
  assert,
  assertType,
};

deprecate(module.exports, "nc.checker", {
  isArray: { use: "nc.is.array()" },
  isNumber: { use: "nc.is.number()" },
  isFinite: { use: "nc.is.finite()" },
  isInteger: { use: "nc.is.integer()" },
  isSafeInteger: { use: "nc.is.safeInteger()" },
  isFloat: { use: "nc.is.float()" },
  isPositive: { use: "nc.is.positive()" },
  isNegative: { use: "nc.is.negative()" },
  isBoolean: { use: "nc.is.boolean()" },
  isString: { use: "nc.is.string()" },
  isSymbol: { use: "nc.is.symbol()" },
  isBigInt: { use: "nc.is.bigInt()" },
  isUndefined: { use: "nc.is.undefined()" },
  isNull: { use: "nc.is.null()" },
  isNil: { use: "nc.is.nil()" },
  isDefined: { use: "nc.is.defined()" },
  isPrimitive: { use: "nc.is.primitive()" },
  isFunction: { use: "nc.is.function()" },
  isAsyncFunction: { use: "nc.is.asyncFunction()" },
  isGeneratorFunction: { use: "nc.is.generatorFunction()" },
  isGenerator: { use: "nc.is.generator()" },
  isClass: { use: "nc.is.class()" },
  isObject: { use: "nc.is.object()" },
  isPlainObject: { use: "nc.is.plainObject()" },
  isPromise: { use: "nc.is.promise()" },
  isRegExp: { use: "nc.is.regExp()" },
  isDate: { use: "nc.is.date()" },
  isValidDate: { use: "nc.is.validDate()" },
  isMap: { use: "nc.is.map()" },
  isSet: { use: "nc.is.set()" },
  isWeakMap: { use: "nc.is.weakMap()" },
  isWeakSet: { use: "nc.is.weakSet()" },
  isIterable: { use: "nc.is.iterable()" },
  isAsyncIterable: { use: "nc.is.asyncIterable()" },
  isBuffer: { use: "nc.is.buffer()" },
  isTypedArray: { use: "nc.is.typedArray()" },
  isError: { use: "nc.is.error()" },
  isEmpty: { use: "nc.is.empty()" },
  isBlank: { use: "nc.is.blank()" },
  isArrayOf: { use: "nc.is.arrayOf()" },
  isOneOf: { use: "nc.is.oneOf()" },
  isEmail: { use: "nc.is.email()" },
  isURL: { use: "nc.is.url()" },
  isUUID: { use: "nc.is.uuid()" },
  isJSON: { use: "nc.is.json()" },
  isNumeric: { use: "nc.is.numeric()" },
  isIP: { use: "nc.is.ip()" },
  isIPv4: { use: "nc.is.ipv4()" },
  isIPv6: { use: "nc.is.ipv6()" },
  isPort: { use: "nc.is.port()" },
  isHex: { use: "nc.is.hex()" },
  isHexColor: { use: "nc.is.hexColor()" },
  isBase64: { use: "nc.is.base64()" },
  isSemver: { use: "nc.is.semver()" },
  isISODate: { use: "nc.is.isoDate()" },
  isSlug: { use: "nc.is.slug()" },
  isAlpha: { use: "nc.is.alpha()" },
  isAlphanumeric: { use: "nc.is.alphanumeric()" },
  isCreditCard: { use: "nc.is.creditCard()" },
  isJWT: { use: "nc.is.jwt()" },
  isHostname: { use: "nc.is.hostname()" },
  isMACAddress: { use: "nc.is.macAddress()" },
  isIBAN: { use: "nc.is.iban()" },
  isE164: { use: "nc.is.e164()" },
  isObjectId: { use: "nc.is.objectId()" },
  isULID: { use: "nc.is.ulid()" },
  isDataURL: { use: "nc.is.dataUrl()" },
  isMimeType: { use: "nc.is.mimeType()" },
  isTimeZone: { use: "nc.is.timeZone()" },
  isLocale: { use: "nc.is.locale()" },
  isCron: { use: "nc.is.cron()" },
  isASCII: { use: "nc.is.ascii()" },
  assert: { use: "nc.assert()" },
  assertType: { use: "nc.assert.type()" },
});
