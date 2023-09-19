import { test, expect } from "vitest";
import {
  create,
  ContextNotFoundError,
  memo,
} from "../../dist/context/context2";

test("missing context", () => {
  const A = create("A");
  expect(A.use).toThrow(ContextNotFoundError);
});

test("with", async () => {
  const A = create("A");
  A.with(1, () => {
    expect(A.use()).toEqual(1);
  });
});

test("with nested", async () => {
  const A = create("A");
  await A.with(1, async () => {
    expect(A.use()).toEqual(1);
    A.with(2, () => expect(A.use()).toEqual(2));
  });
  expect(A.use).toThrow(ContextNotFoundError);
});

test("with async", async () => {
  const A = create("A");
  await A.with(1, async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(A.use()).toEqual(1);
  });
});

test("loop", async () => {
  const A = create("A");
  await Promise.all(
    new Array(10).fill(0).map(async (_, i) => {
      await new Promise((resolve) => setTimeout(resolve, i));
      A.with(i, () => {
        expect(A.use()).toEqual(i);
      });
    })
  );
});

test("memo", () => {
  const A = create<number>("A");
  let runs = 0;
  const B = memo(() => {
    runs++;
    return A.use() * 2;
  });
  A.with(1, () => {
    expect(B()).toEqual(2);
    expect(runs).toEqual(1);
    expect(B()).toEqual(2);
    expect(runs).toEqual(1);
    A.with(2, () => {
      expect(B()).toEqual(4);
    });
    expect(B()).toEqual(2);
    expect(runs).toEqual(2);
  });
});

test("double memo", () => {
  const A = create<number>("A");
  const B = memo(() => A.use() * 2);
  let runs = 0;
  const C = memo(() => {
    runs++;
    return B() * 2;
  });
  A.with(1, () => {
    expect(B()).toEqual(2);
    expect(C()).toEqual(4);
    C();
    expect(runs).toEqual(1);
  });
  expect(C).toThrow(ContextNotFoundError);
});

test("memo async", async () => {
  const A = create<number>("A");
  let runs = 0;
  const B = memo(async () => {
    runs++;
    const a = A.use();
    return new Promise<number>((resolve) =>
      setTimeout(() => resolve(a * 2), 0)
    );
  });
  await A.with(1, async () => {
    expect(await B()).toEqual(2);
    expect(runs).toEqual(1);
    expect(await B()).toEqual(2);
    expect(runs).toEqual(1);
    await A.with(2, async () => {
      expect(await B()).toEqual(4);
    });
    expect(await B()).toEqual(2);
    expect(runs).toEqual(2);
  });
});
