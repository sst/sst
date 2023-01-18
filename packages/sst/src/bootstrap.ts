import url from "url";
import path from "path";
import {
  DescribeStacksCommand,
  CloudFormationClient,
} from "@aws-sdk/client-cloudformation";
import { Tags, Stack, RemovalPolicy, App, CfnOutput } from "aws-cdk-lib";
import { Function, Runtime, Code } from "aws-cdk-lib/aws-lambda";
import { SqsEventSource } from "aws-cdk-lib/aws-lambda-event-sources";
import { PolicyStatement } from "aws-cdk-lib/aws-iam";
import { Queue } from "aws-cdk-lib/aws-sqs";
import { Rule } from "aws-cdk-lib/aws-events";
import { SqsQueue } from "aws-cdk-lib/aws-events-targets";
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
import { spawnSync } from "child_process";

const STACK_NAME = "SSTBootstrap";
const OUTPUT_VERSION = "Version";
const OUTPUT_BUCKET = "BucketName";
const LATEST_VERSION = "6";
const __dirname = url.fileURLToPath(new URL(".", import.meta.url));

const BootstrapContext = Context.create<{
  version: string;
  bucket: string;
}>();

export const useBootstrap = BootstrapContext.use;

export async function initBootstrap() {
  Logger.debug("Initializing bootstrap context");
  await assertCDKToolkit();
  const status = await (async () => {
    const status = await load();
    if (status && status.version === LATEST_VERSION) return status;

    const project = useProject();
    const spinner = createSpinner(
      "Deploying bootstrap stack, this only needs to happen once"
    ).start();

    // Create bootstrap stack
    const app = new App();
    const stack = new Stack(app, STACK_NAME, {
      env: {
        region: project.config.region,
      },
    });

    // Add tags to stack
    const tags: Record<string, string> = {};
    for (const [key, value] of Object.entries(tags)) {
      Tags.of(app).add(key, value);
    }

    // Create S3 bucket to store stacks metadata
    const bucket = new Bucket(stack, project.config.region!, {
      encryption: BucketEncryption.S3_MANAGED,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
    });

    // Create Function and subscribe to CloudFormation events
    const fn = new Function(stack, "MetadataHandler", {
      code: Code.fromAsset(
        path.resolve(__dirname, "support/bootstrap-metadata-function")
      ),
      handler: "index.handler",
      runtime: Runtime.NODEJS_18_X,
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
    const queue = new Queue(stack, "MetadataQueue");
    fn.addEventSource(new SqsEventSource(queue));
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
    rule.addTarget(
      new SqsQueue(queue, {
        retryAttempts: 10,
      })
    );

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
    spinner.succeed();

    // Fetch bootstrap status
    const ret = await load();
    if (!ret) throw new VisibleError("Failed to load bootstrap stack status");
    return ret;
  })();
  BootstrapContext.provide(status);
  Logger.debug("Bootstrap context initialized", status);
}

async function assertCDKToolkit() {
  const client = useAWSClient(CloudFormationClient);
  const { Stacks: stacks } = await client.send(
    new DescribeStacksCommand({
      StackName: "CDKToolkit",
    })
  );

  if (!stacks || stacks.length === 0) {
    const identity = await useSTSIdentity();
    const credentials = await useAWSCredentials();
    const project = useProject();
    spawnSync(
      [
        "npx",
        "cdk",
        "bootstrap",
        `aws://${identity.Account!}/${useProject().config.region}`,
      ].join(" "),
      {
        env: {
          ...process.env,
          AWS_ACCESS_KEY_ID: credentials.accessKeyId,
          AWS_SECRET_ACCESS_KEY: credentials.secretAccessKey,
          AWS_SESSION_TOKEN: credentials.sessionToken,
          AWS_REGION: project.config.region,
          AWS_PROFILE: project.config.profile,
        },
        stdio: "inherit",
        shell: process.env.SHELL || true,
      }
    );
  }
}

async function load() {
  // Get bootstrap CloudFormation stack
  const cf = useAWSClient(CloudFormationClient);
  let result;
  try {
    result = await cf.send(
      new DescribeStacksCommand({
        StackName: STACK_NAME,
      })
    );
  } catch (e: any) {
    if (
      e.Code === "ValidationError" &&
      e.message === `Stack with id ${STACK_NAME} does not exist`
    ) {
      return null;
    }
    throw e;
  }

  // Parse stack outputs
  let version, bucket;
  (result.Stacks![0].Outputs || []).forEach((o) => {
    if (o.OutputKey === OUTPUT_VERSION) {
      version = o.OutputValue;
    } else if (o.OutputKey === OUTPUT_BUCKET) {
      bucket = o.OutputValue;
    }
  });
  if (!version || !bucket) {
    return null;
  }

  return { version, bucket };
}
