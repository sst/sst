import * as cdk from "aws-cdk-lib";
import * as cxapi from "aws-cdk-lib/cx-api";
import { isStackConstruct, isSSTDebugStack } from "./Construct";
import { DebugStack } from "./DebugStack";

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

export class DebugApp extends cdk.App {
  public readonly name: string;
  public readonly stage: string;
  public readonly region: string;
  public readonly account: string;

  constructor(deployProps: DebugAppDeployProps) {
    super();

    this.name = deployProps.name;
    this.stage = deployProps.stage;
    this.region = deployProps.region;
    this.account = process.env.CDK_DEFAULT_ACCOUNT || "my-account";
  }

  synth(options: cdk.StageSynthesisOptions = {}): cxapi.CloudAssembly {
    // Check app has stack
    const stacks = this.node.children.filter((child) =>
      isSSTDebugStack(child)
    );
    if (stacks.length > 1) {
      console.error(`Error: You can only create 1 DebugStack inside the "debugApp()" callback.\n`);
      process.exit(1);
    }
    if (stacks.length === 0) {
      console.error(`Error: The "debugApp()" callback is not creating a DebugStack.\n`);
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

  logicalPrefixedName(logicalName: string): string {
    return `${this.stage}-${this.name}-${logicalName}`;
  }
}
