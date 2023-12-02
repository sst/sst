import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";
import { DistributionInvalidation } from "./distribution-invalidation";

new DistributionInvalidation(`invalidation`, {
  distributionId: "ESWUVI5JLK5EA",
  paths: ["/*"],
  wait: false,
  version: Date.now().toString(16),
});
