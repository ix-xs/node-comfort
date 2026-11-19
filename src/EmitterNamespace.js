"use strict";

/**
 * A small typed event emitter. Declare your events once, and your editor
 * checks every event name and listener argument. `on()` returns a function
 * that removes the listener, and you can `await` an event or loop over
 * events with `for await`.
 *
 * @example
 * const chat = nc.emitter.create<{ message: [text: string, from: string]; close: [] }>();
 * const off = chat.on("message", (text, from) => console.log(`${from}: ${text}`));
 * chat.emit("message", "hello", "ada");
 * off();
 * class Job extends nc.emitter.Emitter<{ done: [result: string] }> {}
 */

const Emitter = require("./Emitter.js");

/**
 * Creates an emitter. Same as `new nc.emitter.Emitter()`; extend
 * `nc.emitter.Emitter` to give a class of yours events.
 *
 * @example
 * const events = nc.emitter.create();
 * events.on("ready", (port) => console.log(port));
 * events.emit("ready", 3000);
 *
 * @template {import("./Emitter").EventMap} [Events=import("./Emitter").EventMap]
 * @returns {Emitter<Events>}
 */
function create() {
  return Emitter.create();
}

module.exports = {
  create,
  Emitter,
};
