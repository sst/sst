import * as cdk from "aws-cdk-lib";
export type Duration = `${number} ${"second" | "seconds" | "minute" | "minutes" | "hour" | "hours" | "day" | "days"}`;

export function toCdkDuration(duration: Duration): cdk.Duration {
  const [count, unit] = duration.split(" ");
  const countNum = parseInt(count);
  const unitLower = unit.toLocaleLowerCase();
  if (unitLower.startsWith("Second")) {
    return cdk.Duration.seconds(countNum);
  }
  else if (unitLower.startsWith("Minute")) {
    return cdk.Duration.minutes(countNum);
  }
  else if (unitLower.startsWith("Hour")) {
    return cdk.Duration.hours(countNum);
  }
  else if (unitLower.startsWith("Day")) {
    return cdk.Duration.days(countNum);
  }

  return cdk.Duration.days(0);
}