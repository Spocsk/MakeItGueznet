"use node";

import { action, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { catalogKindFromUrl } from "./gameLogic";

type ImgflipMeme = {
  id: string;
  name: string;
  url: string;
};

type CatalogDraft = {
  externalId: string;
  name: string;
  url: string;
  kind: "image" | "gif";
  popularity: number;
};

async function fetchImgflipList(url: string): Promise<ImgflipMeme[]> {
  try {
    const response = await fetch(url);
    if (!response.ok) return [];
    const json = (await response.json()) as {
      success?: boolean;
      data?: { memes?: ImgflipMeme[] };
    };
    if (!json.success || !json.data?.memes) return [];
    return json.data.memes;
  } catch {
    return [];
  }
}

async function fetchImgflipCatalog(): Promise<CatalogDraft[]> {
  const sources = [
    { url: "https://api.imgflip.com/get_memes", boost: 10000 },
    { url: "https://api.imgflip.com/get_memes?type=gif", boost: 1000 },
  ];
  const byId = new Map<string, CatalogDraft>();
  for (const source of sources) {
    const memes = await fetchImgflipList(source.url);
    memes.forEach((meme, index) => {
      if (!meme.id || !meme.url) return;
      const popularity = source.boost - index;
      const prev = byId.get(meme.id);
      if (prev && prev.popularity >= popularity) return;
      byId.set(meme.id, {
        externalId: String(meme.id),
        name: meme.name || "template",
        url: meme.url,
        kind: catalogKindFromUrl(meme.url),
        popularity,
      });
    });
  }
  if (byId.size === 0) {
    throw new Error("Catalogue Imgflip indisponible.");
  }
  return [...byId.values()];
}

export const refresh = action({
  args: {},
  returns: v.object({ count: v.number() }),
  handler: async (ctx): Promise<{ count: number }> => {
    const items = await fetchImgflipCatalog();
    const count: number = await ctx.runMutation(internal.catalog.upsertBatch, {
      items,
      now: Date.now(),
    });
    return { count };
  },
});

export const refreshCatalog = internalAction({
  args: {},
  returns: v.null(),
  handler: async (ctx): Promise<null> => {
    const items = await fetchImgflipCatalog();
    await ctx.runMutation(internal.catalog.upsertBatch, {
      items,
      now: Date.now(),
    });
    return null;
  },
});
