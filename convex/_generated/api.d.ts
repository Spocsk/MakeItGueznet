/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as catalog from "../catalog.js";
import type * as catalogActions from "../catalogActions.js";
import type * as crons from "../crons.js";
import type * as events from "../events.js";
import type * as game from "../game.js";
import type * as gameLogic from "../gameLogic.js";
import type * as lib from "../lib.js";
import type * as library from "../library.js";
import type * as profiles from "../profiles.js";
import type * as rooms from "../rooms.js";
import type * as roundEngine from "../roundEngine.js";
import type * as timers from "../timers.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  catalog: typeof catalog;
  catalogActions: typeof catalogActions;
  crons: typeof crons;
  events: typeof events;
  game: typeof game;
  gameLogic: typeof gameLogic;
  lib: typeof lib;
  library: typeof library;
  profiles: typeof profiles;
  rooms: typeof rooms;
  roundEngine: typeof roundEngine;
  timers: typeof timers;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
