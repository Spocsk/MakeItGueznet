"use client";

import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

import { validateUpload } from "../convex/gameLogic";
import { makePosterBlob } from "./poster";

export async function uploadFile(
  generateUploadUrl: (args: { sessionId: string }) => Promise<string>,
  sessionId: string,
  file: File,
) {
  const kind = validateUpload(file.size, file.type, file.name);
  const postUrl = await generateUploadUrl({ sessionId });
  const result = await fetch(postUrl, {
    method: "POST",
    headers: { "Content-Type": file.type },
    body: file,
  });
  if (!result.ok) throw new Error("L’envoi a échoué.");
  const { storageId } = await result.json();
  return { storageId: storageId as Id<"_storage">, kind };
}

export async function uploadWithPoster(
  generateUploadUrl: (args: { sessionId: string }) => Promise<string>,
  sessionId: string,
  file: File,
) {
  const posterPromise = makePosterBlob(file);
  const original = await uploadFile(generateUploadUrl, sessionId, file);
  const poster = await posterPromise;
  if (!poster) return { ...original, thumbStorageId: undefined };
  const thumb = new File([poster], "poster.jpg", { type: "image/jpeg" });
  const { storageId: thumbStorageId } = await uploadFile(
    generateUploadUrl,
    sessionId,
    thumb,
  );
  return { ...original, thumbStorageId };
}

export function useUploader() {
  const generateUploadUrl = useMutation(api.library.generateUploadUrl);
  return (sessionId: string, file: File) =>
    uploadWithPoster(generateUploadUrl, sessionId, file);
}
