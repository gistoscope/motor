import { describe, it, expect } from "vitest";

describe("alias smoke", () => {
  it("can import @motor/tsa via alias", async () => {
    const mod = await import("@motor/tsa");
    expect(typeof mod).toBe("object");
  });
});
