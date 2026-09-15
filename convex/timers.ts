import { internalMutation, mutation } from "./_generated/server";
import { v } from "convex/values";
import { isTimerDue, normalizeCode } from "./gameLogic";
import { fail, requirePlayer } from "./lib";
import { closeCaptionNow, closeVoteNow } from "./roundEngine";

const closedResult = v.object({ closed: v.boolean() });

export const closeCaption = internalMutation({
  args: { roomId: v.id("rooms"), round: v.number() },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    return await closeCaptionNow(ctx, args.roomId, args.round);
  },
});

export const closeVote = internalMutation({
  args: {
    roomId: v.id("rooms"),
    round: v.number(),
    voteIndex: v.number(),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    return await closeVoteNow(
      ctx,
      args.roomId,
      args.round,
      args.voteIndex,
    );
  },
});

export const tryCloseCaption = mutation({
  args: { sessionId: v.string(), code: v.string() },
  returns: closedResult,
  handler: async (ctx, args) => {
    const room = await ctx.db
      .query("rooms")
      .withIndex("by_code", (q) => q.eq("code", normalizeCode(args.code)))
      .unique();
    if (!room) fail("Salle introuvable.");
    await requirePlayer(ctx, room._id, args.sessionId);
    if (room.phase !== "caption") return { closed: false };
    if (!isTimerDue(room.captionEndsAt, Date.now())) return { closed: false };
    const closed = await closeCaptionNow(ctx, room._id, room.round);
    return { closed };
  },
});

export const tryCloseVote = mutation({
  args: { sessionId: v.string(), code: v.string() },
  returns: closedResult,
  handler: async (ctx, args) => {
    const room = await ctx.db
      .query("rooms")
      .withIndex("by_code", (q) => q.eq("code", normalizeCode(args.code)))
      .unique();
    if (!room) fail("Salle introuvable.");
    await requirePlayer(ctx, room._id, args.sessionId);
    if (room.phase !== "vote") return { closed: false };
    if (!isTimerDue(room.voteEndsAt, Date.now())) return { closed: false };
    const closed = await closeVoteNow(
      ctx,
      room._id,
      room.round,
      room.voteIndex ?? 0,
    );
    return { closed };
  },
});
