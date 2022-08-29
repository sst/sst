import { Context } from "../../src/context/context.js";

import { it, describe, expect } from "vitest";

describe("context", () => {
  it("can provide context", () => {
    const ctx = Context.create<number>();
    ctx.provide(1);
    expect(ctx.use()).toBe(1);
  });

  it("memo", () => {
    let counter = 0;
    const memo = Context.memo(() => {
      counter++;
      return true;
    });

    memo();
    memo();
    memo();

    expect(memo()).toBe(true);
    expect(counter).toBe(1);
  });

  it("memo tracking", () => {
    const ctx = Context.create<number>();

    const double = Context.memo(() => ctx.use() * 2);
    const quadruple = Context.memo(() => double() * 2);

    ctx.provide(1);
    expect(double()).toBe(2);
    expect(quadruple()).toBe(4);

    ctx.provide(2);
    expect(double()).toBe(4);
    expect(quadruple()).toBe(8);
  });
});
