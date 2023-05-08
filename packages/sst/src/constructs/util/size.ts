import * as cdk from "aws-cdk-lib";
export type Size = `${number} ${"MB" | "GB"}`;

export function toCdkSize(size: Size): cdk.Size {
  const [count, unit] = size.split(" ");
  const countNum = parseInt(count);
  if (unit === "MB") {
    return cdk.Size.mebibytes(countNum);
  } else if (unit === "GB") {
    return cdk.Size.gibibytes(countNum);
  }
  throw new Error(`Invalid size ${size}`);
}
