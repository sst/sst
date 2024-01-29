export type Size = `${number} ${"MB" | "GB"}`;

export function toMBs(size: Size) {
  const [count, unit] = size.split(" ");
  const countNum = parseInt(count);
  if (unit === "MB") {
    return countNum;
  } else if (unit === "GB") {
    return countNum * 1024;
  }
  throw new Error(`Invalid size ${size}`);
}
