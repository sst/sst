import * as cdk from "aws-cdk-lib";
export type Duration = `${number} ${
  | "second"
  | "seconds"
  | "minute"
  | "minutes"
  | "hour"
  | "hours"
  | "day"
  | "days"}`;

export function toCdkDuration(duration: Duration): cdk.Duration {
  const [count, unit] = duration.split(" ");
  const countNum = parseInt(count);
  const unitLower = unit.toLowerCase();
  if (unitLower.startsWith("second")) {
    return cdk.Duration.seconds(countNum);
  } else if (unitLower.startsWith("minute")) {
    return cdk.Duration.minutes(countNum);
  } else if (unitLower.startsWith("hour")) {
    return cdk.Duration.hours(countNum);
  } else if (unitLower.startsWith("day")) {
    return cdk.Duration.days(countNum);
  }

  return cdk.Duration.days(0);
}
