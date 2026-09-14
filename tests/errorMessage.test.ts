import { describe, expect, it } from "vitest";
import { ConvexError } from "convex/values";
import { errorMessage } from "../lib/errorMessage";

describe("errorMessage", () => {
  it("lit ConvexError.data", () => {
    expect(errorMessage(new ConvexError("Il faut un prénom."), "x")).toBe(
      "Il faut un prénom.",
    );
  });

  it("ignore le wrapping Server Error", () => {
    expect(
      errorMessage(new Error("[CONVEX M(rooms:join)] Server Error Called by client"), "fallback"),
    ).toBe("fallback");
  });
});
