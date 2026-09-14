"use client";

import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

import { validateUpload } from "../convex/gameLogic";

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
  return { storageId, kind };
}

export function useUploader() {
  const generateUploadUrl = useMutation(api.library.generateUploadUrl);
  return (sessionId: string, file: File) =>
    uploadFile(generateUploadUrl, sessionId, file);
}
