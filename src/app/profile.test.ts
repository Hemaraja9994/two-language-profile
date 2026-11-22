import { describe, expect, it } from "vitest";
import { assess, exposure, type Answer } from "./profile";

const A = (o: Record<string, Answer>) => assess(o);

describe("exposure", () => {
  it("returns shares that sum to ~100", () => {
    const ex = exposure([{ name: "Kannada", hrs: "60", age: "0" }, { name: "English", hrs: "20", age: "3" }]);
    expect(ex.map(l => l.pct)).toEqual([75, 25]);
  });
  it("is empty with no reported hours", () => expect(exposure([{ name: "Kannada", hrs: "", age: "0" }])).toEqual([]));
});

describe("assess", () => {
  it("is incomplete under three answers", () => expect(A({ late: "yes" }).level).toBe("incomplete"));
  it("flags concern with two core signs", () => expect(A({ late: "yes", homeWeak: "yes", allLangs: "no" }).level).toBe("high"));
  it("flags concern on weighted score >= 5 even with one core sign", () => {
    const r = A({ family: "yes", understand: "yes", frustration: "yes", late: "yes", homeWeak: "no", allLangs: "no" });
    expect(r.score).toBe(5); expect(r.level).toBe("high");
  });
  it("is a difference when core and score are low", () => {
    const r = A({ late: "no", homeWeak: "no", allLangs: "no", family: "no" });
    expect(r.level).toBe("low");
  });
  it("is a watch with one core sign", () => expect(A({ late: "yes", homeWeak: "no", allLangs: "no" }).level).toBe("mid"));
  it("counts core signs correctly", () => expect(A({ late: "yes", homeWeak: "yes", allLangs: "yes" }).core).toBe(3));
});
