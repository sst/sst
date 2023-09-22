import url from "url";
import path from "path";
import { bold, dim } from "colorette";
import { spawn } from "child_process";
import {
  DescribeStacksCommand,
  CloudFormationClient,
} from "@aws-sdk/client-cloudformation";
import {
  App,
  DefaultStackSynthesizer,
  Duration,
  CfnOutput,
  Tags,
  Stack,
  RemovalPolicy,
} from "aws-cdk-lib/core";
import { Function, Runtime, Code } from "aws-cdk-lib/aws-lambda";
import {
  ManagedPolicy,
  PermissionsBoundary,
  PolicyStatement,
} from "aws-cdk-lib/aws-iam";
import { Rule } from "aws-cdk-lib/aws-events";
import { LambdaFunction } from "aws-cdk-lib/aws-events-targets";
import {
  BlockPublicAccess,
  Bucket,
  BucketEncryption,
} from "aws-cdk-lib/aws-s3";
import { useProject } from "./project.js";
import { createSpinner } from "./cli/spinner.js";
import { Context } from "./context/context.js";
import {
  useAWSClient,
  useAWSCredentials,
  useSTSIdentity,
} from "./credentials.js";
import { VisibleError } from "./error.js";
import { Logger } from "./logger.js";
import { Stacks } from "./stacks/index.js";
import { lazy } from "./util/lazy.js";

const CDK_STACK_NAME = "CDKToolkit";
const SST_STACK_NAME = "SSTBootstrap";
const OUTPUT_VERSION = "Version";
const OUTPUT_BUCKET = "BucketName";
const LATEST_VERSION = "7.2";
const __dirname = url.fileURLToPath(new URL(".", import.meta.url));

export const useBootstrap = lazy(async () => {
  Logger.debug("Initializing bootstrap context");
  let [cdkStatus, sstStatus] = await Promise.all([
    loadCDKStatus(),
    loadSSTStatus(),
  ]);
  Logger.debug("Loaded bootstrap status");
  const needToBootstrapCDK = cdkStatus.status !== "ready";
  const needToBootstrapSST = sstStatus.status !== "ready";

  if (needToBootstrapCDK || needToBootstrapSST) {
    const spinner = createSpinner(
      cdkStatus.status === "bootstrap" || sstStatus.status === "bootstrap"
        ? "Deploying bootstrap stack, this only needs to happen once"
        : "Updating bootstrap stack"
    ).start();

    if (needToBootstrapCDK) {
      await bootstrapCDK();

      // fetch bootstrap status
      cdkStatus = await loadCDKStatus();
      if (cdkStatus.status !== "ready")
        throw new VisibleError("Failed to load bootstrap stack status");
    }
    if (needToBootstrapSST) {
      await bootstrapSST(cdkStatus.bucket!);

      // fetch bootstrap status
      sstStatus = await loadSSTStatus();
      if (sstStatus.status !== "ready")
        throw new VisibleError("Failed to load bootstrap stack status");
    }
    spinner.succeed();
  }

  Logger.debug("Bootstrap context initialized", sstStatus);
  return sstStatus as {
    version: string;
    bucket: string;
  };
});

async function loadCDKStatus() {
  const { cdk } = useProject().config;
  const client = useAWSClient(CloudFormationClient);
  const stackName = cdk?.toolkitStackName || CDK_STACK_NAME;
  try {
    const { Stacks: stacks } = await client.send(
      new DescribeStacksCommand({ StackName: stackName })
    );
    // Check CDK bootstrap stack exists
    if (!stacks || stacks.length === 0) return { status: "bootstrap" };

    // Check CDK bootstrap stack deployed successfully
    if (
      ![
        "CREATE_COMPLETE",
        "UPDATE_COMPLETE",
        "UPDATE_ROLLBACK_COMPLETE",
      ].includes(stacks[0].StackStatus!)
    ) {
      return { status: "bootstrap" };
    }

    // Check CDK bootstrap stack is up to date
    // note: there is no a programmatical way to get the minimal required version
    //       of CDK bootstrap stack. We are going to hardcode it to 14 for now,
    //       which is the latest version as of CDK v2.62.2
    let version: number | undefined;
    let bucket: string | undefined;
    const output = stacks[0].Outputs?.forEach((o) => {
      if (o.OutputKey === "BootstrapVersion") {
        version = parseInt(o.OutputValue!);
      } else if (o.OutputKey === "BucketName") {
        bucket = o.OutputValue!;
      }
    });
    if (!version || version < 14 || !bucket) {
      return { status: "update" };
    }

    return { status: "ready", version, bucket };
  } catch (e: any) {
    if (
      e.name === "ValidationError" &&
      e.message === `Stack with id ${stackName} does not exist`
    ) {
      return { status: "bootstrap" };
    } else {
      throw e;
    }
  }
}

async function loadSSTStatus() {
  // Get bootstrap CloudFormation stack
  const { bootstrap } = useProject().config;
  const cf = useAWSClient(CloudFormationClient);
  const stackName = bootstrap?.stackName || SST_STACK_NAME;
  let result;
  try {
    result = await cf.send(
      new DescribeStacksCommand({
        StackName: stackName,
      })
    );
  } catch (e: any) {
    if (
      e.Code === "ValidationError" &&
      e.message === `Stack with id ${stackName} does not exist`
    ) {
      return { status: "bootstrap" };
    }
    throw e;
  }

  // Parse stack outputs
  let version: string | undefined;
  let bucket: string | undefined;
  (result.Stacks![0].Outputs || []).forEach((o) => {
    if (o.OutputKey === OUTPUT_VERSION) {
      version = o.OutputValue;
    } else if (o.OutputKey === OUTPUT_BUCKET) {
      bucket = o.OutputValue;
    }
  });
  if (!version || !bucket) {
    return { status: "bootstrap" };
  }

  // Need to update bootstrap stack:
  // 1. If current MAJOR version < latest MAJOR version
  // 2. If current MAJOR version > latest MAJOR version (has breaking change)
  // 3. If current MAJOR version == latest MAJOR version,
  //    but current MINOR version < latest MINOR version
  const latestParts = LATEST_VERSION.split(".");
  const latestMajor = parseInt(latestParts[0]);
  const latestMinor = parseInt(latestParts[1] || "0");
  const currentParts = version.split(".");
  const currentMajor = parseInt(currentParts[0]);
  const currentMinor = parseInt(currentParts[1] || "0");
  if (
    currentMajor < latestMajor ||
    currentMajor > latestMajor ||
    currentMinor < latestMinor
  ) {
    return { status: "update" };
  }

  return { status: "ready", version, bucket };
}

export async function bootstrapSST(cdkBucket: string) {
  const { region, bootstrap, cdk } = useProject().config;

  // Create bootstrap stack
  const app = new App();
  const stackName = bootstrap?.stackName || SST_STACK_NAME;
  const stack = new Stack(app, stackName, {
    env: {
      region,
    },
    synthesizer: new DefaultStackSynthesizer({
      qualifier: cdk?.qualifier,
      bootstrapStackVersionSsmParameter: cdk?.bootstrapStackVersionSsmParameter,
      fileAssetsBucketName: cdk?.fileAssetsBucketName,
      deployRoleArn: cdk?.deployRoleArn,
      fileAssetPublishingRoleArn: cdk?.fileAssetPublishingRoleArn,
      imageAssetPublishingRoleArn: cdk?.imageAssetPublishingRoleArn,
      imageAssetsRepositoryName: cdk?.imageAssetsRepositoryName,
      cloudFormationExecutionRole: cdk?.cloudFormationExecutionRole,
      lookupRoleArn: cdk?.lookupRoleArn,
    }),
  });

  // Add tags to stack
  for (const [key, value] of Object.entries(bootstrap?.tags || {})) {
    Tags.of(app).add(key, value);
  }

  // Create S3 bucket to store stacks metadata
  const bucket = bootstrap?.useCdkBucket
    ? {
        bucketName: cdkBucket,
        bucketArn: `arn:${stack.partition}:s3:::${cdkBucket}`,
      }
    : new Bucket(stack, region!, {
        encryption: BucketEncryption.S3_MANAGED,
        removalPolicy: RemovalPolicy.DESTROY,
        autoDeleteObjects: true,
        enforceSSL: true,
        lifecycleRules: [
          {
            id: "Remove partial uploads after 3 days",
            enabled: true,
            abortIncompleteMultipartUploadAfter: Duration.days(3),
          },
        ],
        blockPublicAccess:
          cdk?.publicAccessBlockConfiguration !== false
            ? BlockPublicAccess.BLOCK_ALL
            : undefined,
      });

  // Create Function and subscribe to CloudFormation events
  const fn = new Function(stack, "MetadataHandler", {
    code: Code.fromAsset(
      path.resolve(__dirname, "support/bootstrap-metadata-function")
    ),
    handler: "index.handler",
    runtime: region?.startsWith("us-gov-")
      ? Runtime.NODEJS_16_X
      : Runtime.NODEJS_18_X,
    environment: {
      BUCKET_NAME: bucket.bucketName,
    },
    initialPolicy: [
      new PolicyStatement({
        actions: ["cloudformation:DescribeStacks"],
        resources: ["*"],
      }),
      new PolicyStatement({
        actions: ["s3:PutObject", "s3:DeleteObject"],
        resources: [bucket.bucketArn + "/*"],
      }),
      new PolicyStatement({
        actions: ["iot:Publish"],
        resources: [
          `arn:${stack.partition}:iot:${stack.region}:${stack.account}:topic//sst/*`,
        ],
      }),
    ],
  });
  const rule = new Rule(stack, "MetadataRule", {
    eventPattern: {
      source: ["aws.cloudformation"],
      detailType: ["CloudFormation Stack Status Change"],
      detail: {
        "status-details": {
          status: [
            "CREATE_COMPLETE",
            "UPDATE_COMPLETE",
            "UPDATE_ROLLBACK_COMPLETE",
            "ROLLBACK_COMPLETE",
            "DELETE_COMPLETE",
          ],
        },
      },
    },
  });
  rule.addTarget(new LambdaFunction(fn));

  // Create permissions boundary
  if (cdk?.customPermissionsBoundary) {
    const boundaryPolicy = ManagedPolicy.fromManagedPolicyName(
      stack,
      "PermissionBoundaryPolicy",
      cdk.customPermissionsBoundary
    );
    PermissionsBoundary.of(stack).apply(boundaryPolicy);
  }

  // Create stack outputs to store bootstrap stack info
  new CfnOutput(stack, OUTPUT_VERSION, { value: LATEST_VERSION });
  new CfnOutput(stack, OUTPUT_BUCKET, { value: bucket.bucketName });

  // Deploy bootstrap stack
  const asm = app.synth();
  const result = await Stacks.deploy(asm.stacks[0]);
  if (Stacks.isFailed(result.status)) {
    throw new VisibleError(
      `Failed to deploy bootstrap stack:\n${JSON.stringify(
        result.errors,
        null,
        4
      )}`
    );
  }
}

async function bootstrapCDK() {
  const identity = await useSTSIdentity();
  const credentials = await useAWSCredentials();
  const { region, profile, cdk } = useProject().config;
  await new Promise<void>((resolve, reject) => {
    const proc = spawn(
      [
        "npx",
        "cdk",
        "bootstrap",
        `aws://${identity.Account!}/${region}`,
        "--no-version-reporting",
        ...(cdk?.publicAccessBlockConfiguration === false
          ? ["--public-access-block-configuration", "false"]
          : cdk?.publicAccessBlockConfiguration === true
          ? ["--public-access-block-configuration", "false"]
          : []),
        ...(cdk?.toolkitStackName
          ? ["--toolkit-stack-name", cdk.toolkitStackName]
          : []),
        ...(cdk?.qualifier ? ["--qualifier", cdk.qualifier] : []),
        ...(cdk?.fileAssetsBucketName
          ? ["--toolkit-bucket-name", cdk.fileAssetsBucketName]
          : []),
        ...(cdk?.customPermissionsBoundary
          ? ["--custom-permissions-boundary", cdk.customPermissionsBoundary]
          : []),
      ].join(" "),
      {
        env: {
          ...process.env,
          AWS_ACCESS_KEY_ID: credentials.accessKeyId,
          AWS_SECRET_ACCESS_KEY: credentials.secretAccessKey,
          AWS_SESSION_TOKEN: credentials.sessionToken,
          AWS_REGION: region,
          AWS_PROFILE: profile,
          JSII_SILENCE_WARNING_DEPRECATED_NODE_VERSION: "1",
        },
        stdio: "pipe",
        shell: true,
      }
    );
    let stderr = "";
    proc.stdout.on("data", (data: Buffer) => {
      Logger.debug(data.toString());
    });
    proc.stderr.on("data", (data: Buffer) => {
      Logger.debug(data.toString());
      stderr += data;
    });
    proc.on("exit", (code) => {
      Logger.debug("CDK bootstrap exited with code " + code);
      if (code === 0) {
        resolve();
      } else {
        console.log(bold(dim(stderr)));
        reject(new VisibleError(`Failed to bootstrap`));
      }
    });
  });
}
