import * as cdk from "aws-cdk-lib";
import * as cxapi from "aws-cdk-lib/cx-api";
import { isStackConstruct, isSSTDebugStack } from "./Construct.js";

/**
 * Deploy props for apps.
 */
export interface DebugAppDeployProps {
  /**
   * The app name, used to prefix stacks.
   */
  name: string;
  /**
   * The stage to deploy this app to.
   */
  stage: string;
  /**
   * The region to deploy this app to.
   */
  region: string;
}

/**
 * The DebugApp construct is used internally by SST to
 * - Deploy the [`DebugStack`](DebugStack.md). It contains the resources that powers [Live Lambda Development](/live-lambda-development.md).
 * - Automatically prefix the debug stack name with the stage and app name.
 *
 * It extends [`cdk.App`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.App.html). It's made available as the `app` in the `debugApp()` callback in the `stacks/index.js` of your SST app.
 *
 * ```js
 * export function debugApp(app) {
 *   new sst.DebugStack(app, "debug-stack");
 * }
 * ```
 *
 * Since it is initialized internally, the props that are passed to `DebugApp` cannot be changed.
 *
 * @example
 */
export class DebugApp extends cdk.App {
  /**
   * The name of the app. This comes from the `name` in your `sst.json`.
   */
  public readonly name: string;
  /**
   * The stage the app is being deployed to. If this is not specified as the [`--stage`](/packages/cli.md#--stage) option, it'll default to the stage configured during the initial run of the SST CLI.
   */
  public readonly stage: string;
  /**
   * The region the app is being deployed to. If this is not specified as the [`--region`](/packages/cli.md#--region) option in the SST CLI, it'll default to the `region` in your `sst.json`.
   */
  public readonly region: string;
  /**
   * The AWS account the app is being deployed to. This comes from the IAM credentials being used to run the SST CLI.
   */
  public readonly account: string;

  /**
   * @internal
   */
  constructor(deployProps: DebugAppDeployProps) {
    super();

    this.name = deployProps.name;
    this.stage = deployProps.stage;
    this.region = deployProps.region;
    this.account = process.env.CDK_DEFAULT_ACCOUNT || "my-account";
  }

  synth(options: cdk.StageSynthesisOptions = {}): cxapi.CloudAssembly {
    // Check app has stack
    const stacks = this.node.children.filter((child) => isSSTDebugStack(child));
    if (stacks.length > 1) {
      console.error(
        `Error: You can only create 1 DebugStack inside the "debugApp()" callback.\n`
      );
      process.exit(1);
    }
    if (stacks.length === 0) {
      console.error(
        `Error: The "debugApp()" callback is not creating a DebugStack.\n`
      );
      process.exit(1);
    }

    for (const child of this.node.children) {
      if (isStackConstruct(child)) {
        // Stack names need to be parameterized with the stage name
        if (
          !child.stackName.startsWith(`${this.stage}-`) &&
          !child.stackName.endsWith(`-${this.stage}`) &&
          child.stackName.indexOf(`-${this.stage}-`) === -1
        ) {
          console.error(
            `Error: Stack "${child.stackName}" is not parameterized with the stage name. The stack name needs to either start with "$stage-", end in "-$stage", or contain the stage name "-$stage-".\n`
          );
          process.exit(1);
        }
      }
    }

    return super.synth(options);
  }

  /**
   * Use this method to prefix resource names in your stacks to make sure they don't thrash when deployed to different stages in the same AWS account. This method will prefix a given resource name with the stage and app name. Using the format `${stage}-${name}-${logicalName}`.
   */
  public logicalPrefixedName(logicalName: string): string {
    return `${this.stage}-${this.name}-${logicalName}`;
  }
}
