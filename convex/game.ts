import type { MutationCtx, QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import {
  advanceVote,
  canRateSubmission,
  CAPTION_MAX,
  clampStars,
  eligibleVoterCount,
  normalizeCode,
  sumStars,
} from "./gameLogic";
import { fail, requirePlayer, shuffle } from "./lib";

async function roomByCode(ctx: QueryCtx | MutationCtx, code: string) {
  const room = await ctx.db
    .query("rooms")
    .withIndex("by_code", (q) => q.eq("code", normalizeCode(code)))
    .unique();
  if (!room) fail("Salle introuvable.");
  return room;
}

export const myDeal = query({
  args: { sessionId: v.string(), code: v.string() },
  handler: async (ctx, args) => {
    const room = await ctx.db
      .query("rooms")
      .withIndex("by_code", (q) => q.eq("code", normalizeCode(args.code)))
      .unique();
    if (!room) return null;
    const deal = await ctx.db
      .query("deals")
      .withIndex("by_room_round_session", (q) =>
        q
          .eq("roomId", room._id)
          .eq("round", room.round)
          .eq("sessionId", args.sessionId),
      )
      .unique();
    if (!deal) return null;
    const pool = await ctx.db.get(deal.poolId);
    if (!pool) return null;
    const submission = await ctx.db
      .query("submissions")
      .withIndex("by_room_round_session", (q) =>
        q
          .eq("roomId", room._id)
          .eq("round", room.round)
          .eq("sessionId", args.sessionId),
      )
      .unique();
    return {
      poolId: pool._id,
      kind: pool.kind,
      builtinId: pool.builtinId ?? null,
      url: pool.storageId ? await ctx.storage.getUrl(pool.storageId) : null,
      caption: submission?.caption ?? "",
      submitted: Boolean(submission),
    };
  },
});

export const captionProgress = query({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    const room = await ctx.db
      .query("rooms")
      .withIndex("by_code", (q) => q.eq("code", normalizeCode(args.code)))
      .unique();
    if (!room) return null;
    const players = await ctx.db
      .query("players")
      .withIndex("by_room", (q) => q.eq("roomId", room._id))
      .collect();
    const submissions = await ctx.db
      .query("submissions")
      .withIndex("by_room_round", (q) =>
        q.eq("roomId", room._id).eq("round", room.round),
      )
      .collect();
    return { total: players.length, done: submissions.length };
  },
});

export const submitCaption = mutation({
  args: {
    sessionId: v.string(),
    code: v.string(),
    caption: v.string(),
  },
  handler: async (ctx, args) => {
    const room = await roomByCode(ctx, args.code);
    if (room.phase !== "caption") fail("Ce n’est pas le moment.");
    await requirePlayer(ctx, room._id, args.sessionId);
    const caption = args.caption.trim().slice(0, CAPTION_MAX);
    if (!caption) fail("Écris une légende.");
    const deal = await ctx.db
      .query("deals")
      .withIndex("by_room_round_session", (q) =>
        q
          .eq("roomId", room._id)
          .eq("round", room.round)
          .eq("sessionId", args.sessionId),
      )
      .unique();
    if (!deal) fail("Pas d’image pour cette manche.");
    const existing = await ctx.db
      .query("submissions")
      .withIndex("by_room_round_session", (q) =>
        q
          .eq("roomId", room._id)
          .eq("round", room.round)
          .eq("sessionId", args.sessionId),
      )
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, { caption });
    } else {
      await ctx.db.insert("submissions", {
        roomId: room._id,
        round: room.round,
        sessionId: args.sessionId,
        poolId: deal.poolId,
        caption,
      });
    }

    const players = await ctx.db
      .query("players")
      .withIndex("by_room", (q) => q.eq("roomId", room._id))
      .collect();
    const submissions = await ctx.db
      .query("submissions")
      .withIndex("by_room_round", (q) =>
        q.eq("roomId", room._id).eq("round", room.round),
      )
      .collect();
    if (submissions.length >= players.length) {
      const order = shuffle(submissions.map((s) => s._id));
      await ctx.db.patch(room._id, {
        phase: "vote",
        voteOrder: order,
        voteIndex: 0,
      });
    }
    await ctx.db.insert("events", {
      roomId: room._id,
      sessionId: args.sessionId,
      type: "caption.submit",
      detail: caption.slice(0, 80),
    });
  },
});

export const currentVote = query({
  args: { sessionId: v.string(), code: v.string() },
  handler: async (ctx, args) => {
    const room = await ctx.db
      .query("rooms")
      .withIndex("by_code", (q) => q.eq("code", normalizeCode(args.code)))
      .unique();
    if (!room || room.phase !== "vote" || !room.voteOrder) return null;
    const players = await ctx.db
      .query("players")
      .withIndex("by_room", (q) => q.eq("roomId", room._id))
      .collect();
    const you = players.find((p) => p.sessionId === args.sessionId);
    if (!you) return null;

    const index = room.voteIndex ?? 0;
    if (index >= room.voteOrder.length) {
      return {
        done: true,
        waiting: true,
        isOwn: false,
        total: room.voteOrder.length,
        index,
      };
    }

    const current = await ctx.db.get(room.voteOrder[index]);
    if (!current) {
      return {
        done: true,
        waiting: true,
        isOwn: false,
        total: room.voteOrder.length,
        index,
      };
    }

    const isOwn = current.sessionId === args.sessionId;
    const pool = await ctx.db.get(current.poolId);
    const existing = await ctx.db
      .query("ratings")
      .withIndex("by_submission", (q) => q.eq("submissionId", current._id))
      .collect();
    const yours = existing.find((r) => r.voterSessionId === args.sessionId);

    return {
      done: false,
      waiting: isOwn,
      isOwn,
      submissionId: current._id,
      caption: current.caption,
      kind: pool?.kind ?? "image",
      builtinId: pool?.builtinId ?? null,
      url: pool?.storageId ? await ctx.storage.getUrl(pool.storageId) : null,
      yourStars: yours?.stars ?? null,
      total: room.voteOrder.length,
      index,
    };
  },
});

export const rate = mutation({
  args: {
    sessionId: v.string(),
    code: v.string(),
    submissionId: v.id("submissions"),
    stars: v.number(),
  },
  handler: async (ctx, args) => {
    const stars = clampStars(args.stars);
    const room = await roomByCode(ctx, args.code);
    if (room.phase !== "vote") fail("Ce n’est pas le moment.");
    await requirePlayer(ctx, room._id, args.sessionId);
    const submission = await ctx.db.get(args.submissionId);
    if (!submission || submission.roomId !== room._id) {
      fail("Tirage introuvable.");
    }
    if (!canRateSubmission(args.sessionId, submission.sessionId)) {
      fail("Tu ne notes pas le tien.");
    }
    const order = room.voteOrder ?? [];
    const index = room.voteIndex ?? 0;
    if (order[index] !== args.submissionId) {
      fail("Ce n’est pas ce tirage.");
    }
    const existing = await ctx.db
      .query("ratings")
      .withIndex("by_submission", (q) => q.eq("submissionId", args.submissionId))
      .collect();
    const mine = existing.find((r) => r.voterSessionId === args.sessionId);
    if (mine) await ctx.db.patch(mine._id, { stars });
    else {
      await ctx.db.insert("ratings", {
        roomId: room._id,
        round: room.round,
        voterSessionId: args.sessionId,
        submissionId: args.submissionId,
        stars,
      });
    }
    await ctx.db.insert("events", {
      roomId: room._id,
      sessionId: args.sessionId,
      type: "vote.rate",
      detail: String(stars),
    });

    const players = await ctx.db
      .query("players")
      .withIndex("by_room", (q) => q.eq("roomId", room._id))
      .collect();
    const eligible = eligibleVoterCount(
      players.map((p) => p.sessionId),
      submission.sessionId,
    );
    const fresh = await ctx.db
      .query("ratings")
      .withIndex("by_submission", (q) => q.eq("submissionId", args.submissionId))
      .collect();
    if (fresh.length < eligible) return;

    const next = advanceVote(order.length, index);
    if (next === "score") {
      const allSubs = await ctx.db
        .query("submissions")
        .withIndex("by_room_round", (q) =>
          q.eq("roomId", room._id).eq("round", room.round),
        )
        .collect();
      for (const sub of allSubs) {
        const votes = await ctx.db
          .query("ratings")
          .withIndex("by_submission", (q) => q.eq("submissionId", sub._id))
          .collect();
        const total = sumStars(votes.map((r) => r.stars));
        const player = await ctx.db
          .query("players")
          .withIndex("by_room_session", (q) =>
            q.eq("roomId", room._id).eq("sessionId", sub.sessionId),
          )
          .unique();
        if (player) await ctx.db.patch(player._id, { score: player.score + total });
      }
      await ctx.db.patch(room._id, { phase: "score", voteIndex: order.length });
    } else {
      await ctx.db.patch(room._id, { voteIndex: next });
    }
  },
});

export const scores = query({
  args: { sessionId: v.string(), code: v.string() },
  handler: async (ctx, args) => {
    const room = await ctx.db
      .query("rooms")
      .withIndex("by_code", (q) => q.eq("code", normalizeCode(args.code)))
      .unique();
    if (!room) return null;
    const you = await ctx.db
      .query("players")
      .withIndex("by_room_session", (q) =>
        q.eq("roomId", room._id).eq("sessionId", args.sessionId),
      )
      .unique();
    if (!you) return null;
    const players = await ctx.db
      .query("players")
      .withIndex("by_room", (q) => q.eq("roomId", room._id))
      .collect();
    const submissions = await ctx.db
      .query("submissions")
      .withIndex("by_room_round", (q) =>
        q.eq("roomId", room._id).eq("round", room.round),
      )
      .collect();
    const prints = await Promise.all(
      submissions.map(async (sub) => {
        const pool = await ctx.db.get(sub.poolId);
        const votes = await ctx.db
          .query("ratings")
          .withIndex("by_submission", (q) => q.eq("submissionId", sub._id))
          .collect();
        const author = players.find((p) => p.sessionId === sub.sessionId);
        return {
          id: sub._id,
          caption: sub.caption,
          author: author?.name ?? "?",
          isYou: sub.sessionId === args.sessionId,
          stars: votes.reduce((acc, r) => acc + r.stars, 0),
          kind: pool?.kind ?? "image",
          builtinId: pool?.builtinId ?? null,
          url: pool?.storageId ? await ctx.storage.getUrl(pool.storageId) : null,
        };
      }),
    );
    prints.sort((a, b) => b.stars - a.stars);
    const ranking = [...players].sort((a, b) => b.score - a.score);
    return {
      prints,
      ranking,
      isHost: room.hostSessionId === args.sessionId,
    };
  },
});
