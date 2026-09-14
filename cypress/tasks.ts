import { ConvexHttpClient } from "convex/browser";
import { ConvexError } from "convex/values";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";

function convexMessage(err: unknown) {
  if (err instanceof ConvexError && typeof err.data === "string") return err.data;
  if (typeof err === "object" && err && "data" in err) {
    const data = (err as { data: unknown }).data;
    if (typeof data === "string") return data;
  }
  return err instanceof Error ? err.message : String(err);
}

type LoopState = {
  stop: boolean;
  phase: string;
  error?: string;
};

const loops = new Map<string, LoopState>();

function convexUrl() {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) throw new Error("NEXT_PUBLIC_CONVEX_URL manquant");
  return url;
}

function client() {
  return new ConvexHttpClient(convexUrl());
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function playTick(
  convex: ConvexHttpClient,
  sessionId: string,
  code: string,
) {
  const state = await convex.query(api.rooms.getByCode, { code, sessionId });
  if (!state) return "missing";
  if (state.room.phase === "caption") {
    const deal = await convex.query(api.game.myDeal, { code, sessionId });
    if (deal && !deal.submitted) {
      await convex.mutation(api.game.submitCaption, {
        sessionId,
        code,
        caption: "légende invitée",
      });
    }
  }
  if (state.room.phase === "vote") {
    const ballot = await convex.query(api.game.currentVote, { code, sessionId });
    if (
      ballot &&
      !ballot.done &&
      !ballot.isOwn &&
      ballot.submissionId &&
      ballot.yourStars == null
    ) {
      try {
        await convex.mutation(api.game.rate, {
          sessionId,
          code,
          submissionId: ballot.submissionId as Id<"submissions">,
          stars: 5,
        });
      } catch {
        // l’index de vote a pu avancer
      }
    }
  }
  return state.room.phase;
}

async function runLoop(sessionId: string, code: string, name: string) {
  const convex = client();
  const loop = loops.get(sessionId);
  if (!loop) return;
  try {
    await convex.mutation(api.rooms.join, { sessionId, name, code });
    while (!loop.stop) {
      loop.phase = await playTick(convex, sessionId, code);
      await sleep(200);
    }
  } catch (err) {
    loop.error = convexMessage(err);
  }
}

export const tasks = {
  guestLoopStart({
    sessionId,
    code,
    name,
  }: {
    sessionId: string;
    code: string;
    name: string;
  }) {
    loops.set(sessionId, { stop: false, phase: "starting" });
    void runLoop(sessionId, code, name);
    return { ok: true };
  },

  guestLoopStop(sessionId: string) {
    const loop = loops.get(sessionId);
    if (loop) loop.stop = true;
    return loop ?? { stop: true, phase: "none" };
  },

  guestLoopStatus(sessionId: string) {
    return loops.get(sessionId) ?? null;
  },

  async joinRoom(args: { sessionId: string; name: string; code: string }) {
    try {
      const room = await client().mutation(api.rooms.join, args);
      return { ok: true, code: room.code };
    } catch (err) {
      return {
        ok: false,
        message: convexMessage(err),
      };
    }
  },

  async startRound(args: { sessionId: string; code: string }) {
    try {
      await client().mutation(api.rooms.startRound, args);
      return { ok: true };
    } catch (err) {
      return {
        ok: false,
        message: convexMessage(err),
      };
    }
  },

  async rateCurrent(args: {
    sessionId: string;
    code: string;
    stars: number;
  }) {
    try {
      const ballot = await client().query(api.game.currentVote, {
        sessionId: args.sessionId,
        code: args.code,
      });
      if (!ballot?.submissionId) {
        return { ok: false, message: "Pas de tirage." };
      }
      await client().mutation(api.game.rate, {
        sessionId: args.sessionId,
        code: args.code,
        submissionId: ballot.submissionId as Id<"submissions">,
        stars: args.stars,
      });
      return { ok: true, isOwn: ballot.isOwn };
    } catch (err) {
      return {
        ok: false,
        message: convexMessage(err),
      };
    }
  },

  async listRoomEvents(code: string) {
    return await client().query(api.events.listByCode, { code });
  },

  async listSessionEvents(sessionId: string) {
    return await client().query(api.events.listBySession, { sessionId });
  },
};
