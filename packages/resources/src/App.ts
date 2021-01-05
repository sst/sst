import * as cdk from "@aws-cdk/core";
import * as cxapi from "@aws-cdk/cx-api";
import { HandlerProps } from "./Function";

/**
 * Deploy props for apps.
 */
export interface DeployProps {
  /**
   * The app name, used to prefix stacks.
   *
   * @default - Defaults to empty string
   */
  readonly name?: string;

  /**
   * The stage to deploy this app to.
   *
   * @default - Defaults to dev
   */
  readonly stage?: string;

  /**
   * The region to deploy this app to.
   *
   * @default - Defaults to us-east-1
   */
  readonly region?: string;

  /**
   * The local WebSockets debug enpoint used by `sst start`.
   *
   * @default - Defaults to undefined
   */
  readonly debugEndpoint?: string;

  /**
   * The callback after synth completes, used by `sst start`.
   *
   * @default - Defaults to undefined
   */
  readonly synthCallback?: (lambdaHandlers: Array<HandlerProps>) => void;
}

export type AppProps = cdk.AppProps;

export class App extends cdk.App {
  /**
   * Is the app being deployed locally
   */
  public readonly local: boolean = false;

  /**
   * The app name
   */
  public readonly name: string;

  /**
   * The stage to deploy to
   */
  public readonly stage: string;

  /**
   * The region to deploy to
   */
  public readonly region: string;

  /**
   * The local WebSockets debug endpoint
   */
  public readonly debugEndpoint?: string;

  /**
   * The build dir for the SST app
   */
  public readonly buildDir: string = ".build";

  /**
   * The callback after synth completes.
   */
  private readonly synthCallback?: (
    lambdaHandlers: Array<HandlerProps>
  ) => void;

  /**
   * A list of Lambda functions in the app
   */
  private readonly lambdaHandlers: Array<HandlerProps> = [];

  constructor(deployProps: DeployProps = {}, props: AppProps = {}) {
    super(props);

    this.stage = deployProps.stage || "dev";
    this.name = deployProps.name || "my-app";
    this.region = deployProps.region || "us-east-1";

    if (deployProps.debugEndpoint) {
      this.local = true;
      this.debugEndpoint = deployProps.debugEndpoint;
      this.synthCallback = deployProps.synthCallback;
    }
  }

  logicalPrefixedName(logicalName: string): string {
    const namePrefix = this.name === "" ? "" : `${this.name}-`;
    return `${this.stage}-${namePrefix}${logicalName}`;
  }

  synth(options: cdk.StageSynthesisOptions = {}): cxapi.CloudAssembly {
    for (const child of this.node.children) {
      if (
        child instanceof cdk.Stack &&
        child.stackName.indexOf(`${this.stage}-`) !== 0
      ) {
        throw new Error(
          `Stack (${child.stackName}) is not prefixed with the stage. Use sst.Stack or the format {stageName}-${child.stackName}.`
        );
      }
    }
    const cloudAssembly = super.synth(options);

    // Run callback after synth has finished
    if (this.synthCallback) {
      this.synthCallback(this.lambdaHandlers);
    }

    return cloudAssembly;
  }

  registerLambdaHandler(handler: HandlerProps): void {
    this.lambdaHandlers.push(handler);
  }
}
