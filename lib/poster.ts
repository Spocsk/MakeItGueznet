const POSTER_MAX = 360;
const POSTER_QUALITY = 0.82;

export async function makePosterBlob(file: File): Promise<Blob | null> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(
      1,
      POSTER_MAX / Math.max(bitmap.width, bitmap.height),
    );
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return null;
    }
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    return await new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), "image/jpeg", POSTER_QUALITY);
    });
  } catch {
    return null;
  }
}

export function isVideoSource(url?: string | null) {
  const lower = url?.toLowerCase() ?? "";
  return (
    lower.includes(".mp4") ||
    lower.includes(".webm") ||
    lower.includes(".mov")
  );
}

export function isGifSource(
  kind?: string | null,
  url?: string | null,
) {
  if (kind === "gif") return true;
  const lower = url?.toLowerCase() ?? "";
  return lower.includes(".gif") || isVideoSource(url);
}
