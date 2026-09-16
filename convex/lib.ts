import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { ConvexError } from "convex/values";
import { catalogKindFromUrl } from "./gameLogic";

export function fail(message: string): never {
  throw new ConvexError(message);
}

export async function requireProfile(
  ctx: QueryCtx | MutationCtx,
  sessionId: string,
) {
  const profile = await ctx.db
    .query("profiles")
    .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
    .unique();
  if (!profile) {
    fail("Profil introuvable. Réessaie avec un prénom.");
  }
  return profile;
}

export async function requirePlayer(
  ctx: QueryCtx | MutationCtx,
  roomId: Id<"rooms">,
  sessionId: string,
) {
  const player = await ctx.db
    .query("players")
    .withIndex("by_room_session", (q) =>
      q.eq("roomId", roomId).eq("sessionId", sessionId),
    )
    .unique();
  if (!player) {
    fail("Tu n’es pas dans cette salle.");
  }
  return player;
}

function isMotionUrl(url: string | undefined) {
  return url ? catalogKindFromUrl(url) === "gif" : false;
}

export async function poolSrc(
  ctx: QueryCtx | MutationCtx,
  pool: Doc<"pool"> | null,
) {
  if (!pool) return null;
  if (pool.storageId) return await ctx.storage.getUrl(pool.storageId);
  return pool.remoteUrl ?? null;
}

export async function poolThumbSrc(
  ctx: QueryCtx | MutationCtx,
  pool: Doc<"pool"> | null,
) {
  if (!pool) return null;
  if (pool.thumbStorageId) {
    return await ctx.storage.getUrl(pool.thumbStorageId);
  }
  if (pool.builtinId) return null;
  if (pool.kind === "gif" || isMotionUrl(pool.remoteUrl)) return null;
  if (pool.storageId) return await ctx.storage.getUrl(pool.storageId);
  return pool.remoteUrl ?? null;
}

export async function cancelJob(
  ctx: MutationCtx,
  jobId: Id<"_scheduled_functions"> | undefined,
) {
  if (!jobId) return;
  try {
    await ctx.scheduler.cancel(jobId);
  } catch {
    // déjà joué ou déjà annulé
  }
}

export { roomCodeFromRandom as roomCode, shuffleWith as shuffle } from "./gameLogic";
