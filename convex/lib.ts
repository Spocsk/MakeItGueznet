import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { ConvexError } from "convex/values";

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

export { roomCodeFromRandom as roomCode, shuffleWith as shuffle } from "./gameLogic";
