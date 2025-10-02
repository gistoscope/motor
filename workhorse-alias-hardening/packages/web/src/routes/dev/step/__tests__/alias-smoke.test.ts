import { describe, it, expect } from "vitest";

describe("alias smoke for @motor/tsa", () => {
  it("imports package namespace without crashing", async () => {
    const mod = await import("@motor/tsa");
    expect(mod).toBeTypeOf("object");
    // Optionally assert a commonly used export if present
    if ("chooseFirstStep" in mod) {
      expect(typeof (mod as any).chooseFirstStep).toBe("function");
    }
  });
});
