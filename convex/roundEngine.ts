import type { MutationCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import {
  extraBuiltinsNeeded,
  effectiveCaptionSeconds,
  effectiveCatalogFilter,
  effectiveRoundCount,
  matchIsOver,
  pickCatalogFill,
  pickUniqueDeals,
  sortCatalog,
  sumStars,
  VOTE_SECONDS,
} from "./gameLogic";
import { cancelJob, fail, shuffle } from "./lib";

export async function fillPoolIfShort(
  ctx: MutationCtx,
  room: Doc<"rooms">,
  playerCount: number,
  addedBy: string,
) {
  const pool = await ctx.db
    .query("pool")
    .withIndex("by_room", (q) => q.eq("roomId", room._id))
    .collect();

  if (pool.length < playerCount) {
    const catalog = await ctx.db.query("catalog").collect();
    const sorted = sortCatalog(
      catalog,
      effectiveCatalogFilter(room.catalogFilter),
    );
    const used = pool
      .map((item) => item.remoteUrl)
      .filter((url): url is string => Boolean(url));
    const picked = pickCatalogFill(
      sorted,
      used,
      playerCount - pool.length,
    );
    for (const item of picked) {
      const id = await ctx.db.insert("pool", {
        roomId: room._id,
        catalogId: item._id,
        remoteUrl: item.url,
        kind: "remote",
        addedBy,
      });
      const row = await ctx.db.get(id);
      if (row) pool.push(row);
    }
  }

  const extra = extraBuiltinsNeeded(
    pool.length,
    playerCount,
    pool
      .map((item) => item.builtinId)
      .filter((id): id is string => Boolean(id)),
  );
  for (const builtinId of extra) {
    const id = await ctx.db.insert("pool", {
      roomId: room._id,
      builtinId,
      kind: "builtin",
      addedBy,
    });
    const row = await ctx.db.get(id);
    if (row) pool.push(row);
  }

  return pool;
}

export async function dealAndBeginCaption(
  ctx: MutationCtx,
  room: Doc<"rooms">,
  players: Doc<"players">[],
  pool: Doc<"pool">[],
  hostSessionId: string,
) {
  if (pool.length < players.length) {
    fail("Il faut au moins une image par joueur.");
  }
  const round = room.round + 1;
  const dealt = pickUniqueDeals(pool, players.length);
  for (let i = 0; i < players.length; i++) {
    await ctx.db.insert("deals", {
      roomId: room._id,
      round,
      sessionId: players[i].sessionId,
      poolId: dealt[i]._id,
    });
  }
  await cancelJob(ctx, room.captionJobId);
  await cancelJob(ctx, room.voteJobId);
  const seconds = effectiveCaptionSeconds(room.captionSeconds);
  const captionEndsAt = Date.now() + seconds * 1000;
  const captionJobId = await ctx.scheduler.runAfter(
    seconds * 1000,
    internal.timers.closeCaption,
    { roomId: room._id, round },
  );
  await ctx.db.patch(room._id, {
    phase: "caption",
    round,
    voteOrder: undefined,
    voteIndex: 0,
    captionEndsAt,
    captionJobId,
    voteEndsAt: undefined,
    voteJobId: undefined,
  });
  await ctx.db.insert("events", {
    roomId: room._id,
    sessionId: hostSessionId,
    type: "round.start",
    detail: String(round),
  });
}

export async function enterVote(
  ctx: MutationCtx,
  room: Doc<"rooms">,
  submissionIds: Id<"submissions">[],
) {
  await cancelJob(ctx, room.captionJobId);
  const order = shuffle(submissionIds);
  await ctx.db.patch(room._id, {
    phase: "vote",
    voteOrder: order,
    voteIndex: 0,
    captionEndsAt: undefined,
    captionJobId: undefined,
  });
  const next = await ctx.db.get(room._id);
  if (!next) return;
  await scheduleVoteSlot(ctx, next, 0);
}

export async function scheduleVoteSlot(
  ctx: MutationCtx,
  room: Doc<"rooms">,
  voteIndex: number,
) {
  await cancelJob(ctx, room.voteJobId);
  const voteEndsAt = Date.now() + VOTE_SECONDS * 1000;
  const voteJobId = await ctx.scheduler.runAfter(
    VOTE_SECONDS * 1000,
    internal.timers.closeVote,
    { roomId: room._id, round: room.round, voteIndex },
  );
  await ctx.db.patch(room._id, {
    voteIndex,
    voteEndsAt,
    voteJobId,
  });
}

export async function enterScore(ctx: MutationCtx, room: Doc<"rooms">) {
  await cancelJob(ctx, room.captionJobId);
  await cancelJob(ctx, room.voteJobId);
  const submissions = await ctx.db
    .query("submissions")
    .withIndex("by_room_round", (q) =>
      q.eq("roomId", room._id).eq("round", room.round),
    )
    .collect();
  for (const sub of submissions) {
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
  const roundCount = effectiveRoundCount(room.roundCount);
  await ctx.db.patch(room._id, {
    phase: "score",
    voteIndex: (room.voteOrder ?? []).length,
    captionEndsAt: undefined,
    voteEndsAt: undefined,
    captionJobId: undefined,
    voteJobId: undefined,
  });
  await ctx.db.insert("events", {
    roomId: room._id,
    sessionId: room.hostSessionId,
    type: matchIsOver(room.round, roundCount) ? "match.over" : "round.score",
    detail: String(room.round),
  });
}

export async function closeCaptionNow(
  ctx: MutationCtx,
  roomId: Id<"rooms">,
  round: number,
) {
  const room = await ctx.db.get(roomId);
  if (!room || room.phase !== "caption" || room.round !== round) return false;
  const submissions = await ctx.db
    .query("submissions")
    .withIndex("by_room_round", (q) =>
      q.eq("roomId", room._id).eq("round", room.round),
    )
    .collect();
  await ctx.db.insert("events", {
    roomId: room._id,
    sessionId: room.hostSessionId,
    type: "caption.timeout",
    detail: String(submissions.length),
  });
  if (submissions.length === 0) {
    await enterScore(ctx, room);
    return true;
  }
  await enterVote(
    ctx,
    room,
    submissions.map((row) => row._id),
  );
  return true;
}

export async function closeVoteNow(
  ctx: MutationCtx,
  roomId: Id<"rooms">,
  round: number,
  voteIndex: number,
) {
  const room = await ctx.db.get(roomId);
  if (!room || room.phase !== "vote" || room.round !== round) return false;
  if ((room.voteIndex ?? 0) !== voteIndex) return false;
  await ctx.db.insert("events", {
    roomId: room._id,
    sessionId: room.hostSessionId,
    type: "vote.timeout",
    detail: String(voteIndex),
  });
  await advanceFromVote(ctx, room);
  return true;
}

export async function advanceFromVote(ctx: MutationCtx, room: Doc<"rooms">) {
  const order = room.voteOrder ?? [];
  const index = room.voteIndex ?? 0;
  const next = index + 1;
  if (next >= order.length) {
    await enterScore(ctx, room);
    return;
  }
  await scheduleVoteSlot(ctx, room, next);
}
