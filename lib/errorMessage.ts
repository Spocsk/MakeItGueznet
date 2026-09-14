import { ConvexError } from "convex/values";

export function errorMessage(err: unknown, fallback: string) {
  if (err instanceof ConvexError) {
    const data = err.data;
    if (typeof data === "string" && data.trim()) return data;
  }
  if (typeof err === "object" && err !== null && "data" in err) {
    const data = (err as { data: unknown }).data;
    if (typeof data === "string" && data.trim()) return data;
  }
  if (err instanceof Error) {
    const stripped = err.message.replace(/^\[CONVEX [^\]]+\]\s*/, "");
    const uncaught = stripped.match(/Uncaught Error:\s*(.+)/);
    const text = (uncaught?.[1] ?? stripped).trim();
    if (text && !/Server Error/i.test(text)) return text;
  }
  return fallback;
}
