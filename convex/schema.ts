import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  profiles: defineTable({
    sessionId: v.string(),
    name: v.string(),
  }).index("by_session", ["sessionId"]),

  media: defineTable({
    sessionId: v.string(),
    storageId: v.id("_storage"),
    kind: v.union(v.literal("image"), v.literal("gif")),
    title: v.optional(v.string()),
  }).index("by_session", ["sessionId"]),

  rooms: defineTable({
    code: v.string(),
    hostSessionId: v.string(),
    phase: v.union(
      v.literal("lobby"),
      v.literal("caption"),
      v.literal("vote"),
      v.literal("score"),
    ),
    round: v.number(),
    voteOrder: v.optional(v.array(v.id("submissions"))),
    voteIndex: v.optional(v.number()),
  }).index("by_code", ["code"]),

  players: defineTable({
    roomId: v.id("rooms"),
    sessionId: v.string(),
    name: v.string(),
    score: v.number(),
  })
    .index("by_room", ["roomId"])
    .index("by_room_session", ["roomId", "sessionId"]),

  pool: defineTable({
    roomId: v.id("rooms"),
    storageId: v.optional(v.id("_storage")),
    builtinId: v.optional(v.string()),
    kind: v.union(v.literal("image"), v.literal("gif"), v.literal("builtin")),
    addedBy: v.string(),
  }).index("by_room", ["roomId"]),

  deals: defineTable({
    roomId: v.id("rooms"),
    round: v.number(),
    sessionId: v.string(),
    poolId: v.id("pool"),
  })
    .index("by_room_round", ["roomId", "round"])
    .index("by_room_round_session", ["roomId", "round", "sessionId"]),

  submissions: defineTable({
    roomId: v.id("rooms"),
    round: v.number(),
    sessionId: v.string(),
    poolId: v.id("pool"),
    caption: v.string(),
  })
    .index("by_room_round", ["roomId", "round"])
    .index("by_room_round_session", ["roomId", "round", "sessionId"]),

  ratings: defineTable({
    roomId: v.id("rooms"),
    round: v.number(),
    voterSessionId: v.string(),
    submissionId: v.id("submissions"),
    stars: v.number(),
  })
    .index("by_room_round_voter", ["roomId", "round", "voterSessionId"])
    .index("by_submission", ["submissionId"]),

  events: defineTable({
    roomId: v.optional(v.id("rooms")),
    sessionId: v.string(),
    type: v.string(),
    detail: v.optional(v.string()),
  })
    .index("by_room", ["roomId"])
    .index("by_session", ["sessionId"]),
});
