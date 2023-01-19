// Copied from https://github.com/aws/aws-cdk/blob/main/packages/aws-cdk/lib/api/cloudformation-deployments.ts

import * as cxapi from "@aws-cdk/cx-api";
import { AssetManifest } from "cdk-assets";
import { Tag } from "aws-cdk/lib/cdk-toolkit.js";
import { debug, warning } from "aws-cdk/lib/logging.js";
import {
  buildAssets,
  publishAssets,
  BuildAssetsOptions,
  PublishAssetsOptions,
} from "aws-cdk/lib/util/asset-publishing.js";
import { Mode } from "aws-cdk/lib/api/aws-auth/credentials.js";
import { ISDK } from "aws-cdk/lib/api/aws-auth/sdk.js";
import { SdkProvider } from "aws-cdk/lib/api/aws-auth/sdk-provider.js";
import {
  deployStack,
  DeployStackResult,
  destroyStack,
  makeBodyParameterAndUpload,
  DeploymentMethod,
} from "./deploy-stack.js";
import {
  loadCurrentTemplateWithNestedStacks,
  loadCurrentTemplate,
} from "aws-cdk/lib/api/nested-stack-helpers.js";
import { ToolkitInfo } from "aws-cdk/lib/api/toolkit-info.js";
import {
  CloudFormationStack,
  Template,
  ResourcesToImport,
  ResourceIdentifierSummaries,
} from "aws-cdk/lib/api/util/cloudformation.js";
import { StackActivityProgress } from "aws-cdk/lib/api/util/cloudformation/stack-activity-monitor.js";
import { replaceEnvPlaceholders } from "aws-cdk/lib/api/util/placeholders.js";

/**
 * SDK obtained by assuming the lookup role
 * for a given environment
 */
export interface PreparedSdkWithLookupRoleForEnvironment {
  /**
   * The SDK for the given environment
   */
  readonly sdk: ISDK;

  /**
   * The resolved environment for the stack
   * (no more 'unknown-account/unknown-region')
   */
  readonly resolvedEnvironment: cxapi.Environment;

  /**
   * Whether or not the assume role was successful.
   * If the assume role was not successful (false)
   * then that means that the 'sdk' returned contains
   * the default credentials (not the assume role credentials)
   */
  readonly didAssumeRole: boolean;
}

/**
 * Try to use the bootstrap lookupRole. There are two scenarios that are handled here
 *  1. The lookup role may not exist (it was added in bootstrap stack version 7)
 *  2. The lookup role may not have the correct permissions (ReadOnlyAccess was added in
 *      bootstrap stack version 8)
 *
 * In the case of 1 (lookup role doesn't exist) `forEnvironment` will either:
 *   1. Return the default credentials if the default credentials are for the stack account
 *   2. Throw an error if the default credentials are not for the stack account.
 *
 * If we successfully assume the lookup role we then proceed to 2 and check whether the bootstrap
 * stack version is valid. If it is not we throw an error which should be handled in the calling
 * function (and fallback to use a different role, etc)
 *
 * If we do not successfully assume the lookup role, but do get back the default credentials
 * then return those and note that we are returning the default credentials. The calling
 * function can then decide to use them or fallback to another role.
 */
export async function prepareSdkWithLookupRoleFor(
  sdkProvider: SdkProvider,
  stack: cxapi.CloudFormationStackArtifact
): Promise<PreparedSdkWithLookupRoleForEnvironment> {
  const resolvedEnvironment = await sdkProvider.resolveEnvironment(
    stack.environment
  );

  // Substitute any placeholders with information about the current environment
  const arns = await replaceEnvPlaceholders(
    {
      lookupRoleArn: stack.lookupRole?.arn,
    },
    resolvedEnvironment,
    sdkProvider
  );

  // try to assume the lookup role
  const warningMessage = `Could not assume ${arns.lookupRoleArn}, proceeding anyway.`;
  const upgradeMessage = `(To get rid of this warning, please upgrade to bootstrap version >= ${stack.lookupRole?.requiresBootstrapStackVersion})`;
  try {
    const stackSdk = await sdkProvider.forEnvironment(
      resolvedEnvironment,
      Mode.ForReading,
      {
        assumeRoleArn: arns.lookupRoleArn,
        assumeRoleExternalId: stack.lookupRole?.assumeRoleExternalId,
      }
    );

    // if we succeed in assuming the lookup role, make sure we have the correct bootstrap stack version
    if (
      stackSdk.didAssumeRole &&
      stack.lookupRole?.bootstrapStackVersionSsmParameter &&
      stack.lookupRole.requiresBootstrapStackVersion
    ) {
      const version = await ToolkitInfo.versionFromSsmParameter(
        stackSdk.sdk,
        stack.lookupRole.bootstrapStackVersionSsmParameter
      );
      if (version < stack.lookupRole.requiresBootstrapStackVersion) {
        throw new Error(
          `Bootstrap stack version '${stack.lookupRole.requiresBootstrapStackVersion}' is required, found version '${version}'.`
        );
      }
      // we may not have assumed the lookup role because one was not provided
      // if that is the case then don't print the upgrade warning
    } else if (
      !stackSdk.didAssumeRole &&
      stack.lookupRole?.requiresBootstrapStackVersion
    ) {
      warning(upgradeMessage);
    }
    return { ...stackSdk, resolvedEnvironment };
  } catch (e: any) {
    debug(e);
    // only print out the warnings if the lookupRole exists AND there is a required
    // bootstrap version, otherwise the warnings will print `undefined`
    if (stack.lookupRole && stack.lookupRole.requiresBootstrapStackVersion) {
      warning(warningMessage);
      warning(upgradeMessage);
    }
    throw e;
  }
}

export interface DeployStackOptions {
  /**
   * Stack to deploy
   */
  readonly stack: cxapi.CloudFormationStackArtifact;

  /**
   * Execution role for the deployment (pass through to CloudFormation)
   *
   * @default - Current role
   */
  readonly roleArn?: string;

  /**
   * Topic ARNs to send a message when deployment finishes (pass through to CloudFormation)
   *
   * @default - No notifications
   */
  readonly notificationArns?: string[];

  /**
   * Override name under which stack will be deployed
   *
   * @default - Use artifact default
   */
  readonly deployName?: string;

  /**
   * Don't show stack deployment events, just wait
   *
   * @default false
   */
  readonly quiet?: boolean;

  /**
   * Name of the toolkit stack, if not the default name
   *
   * @default 'CDKToolkit'
   */
  readonly toolkitStackName?: string;

  /**
   * List of asset IDs which should NOT be built or uploaded
   *
   * @default - Build all assets
   */
  readonly reuseAssets?: string[];

  /**
   * Stack tags (pass through to CloudFormation)
   */
  readonly tags?: Tag[];

  /**
   * Stage the change set but don't execute it
   *
   * @default - true
   * @deprecated Use 'deploymentMethod' instead
   */
  readonly execute?: boolean;

  /**
   * Optional name to use for the CloudFormation change set.
   * If not provided, a name will be generated automatically.
   *
   * @deprecated Use 'deploymentMethod' instead
   */
  readonly changeSetName?: string;

  /**
   * Select the deployment method (direct or using a change set)
   *
   * @default - Change set with default options
   */
  readonly deploymentMethod?: DeploymentMethod;

  /**
   * Force deployment, even if the deployed template is identical to the one we are about to deploy.
   * @default false deployment will be skipped if the template is identical
   */
  readonly force?: boolean;

  /**
   * Extra parameters for CloudFormation
   * @default - no additional parameters will be passed to the template
   */
  readonly parameters?: { [name: string]: string | undefined };

  /**
   * Use previous values for unspecified parameters
   *
   * If not set, all parameters must be specified for every deployment.
   *
   * @default true
   */
  readonly usePreviousParameters?: boolean;

  /**
   * Display mode for stack deployment progress.
   *
   * @default - StackActivityProgress.Bar - stack events will be displayed for
   *   the resource currently being deployed.
   */
  readonly progress?: StackActivityProgress;

  /**
   * Whether we are on a CI system
   *
   * @default false
   */
  readonly ci?: boolean;

  /**
   * Rollback failed deployments
   *
   * @default true
   */
  readonly rollback?: boolean;

  /*
   * Whether to perform a 'hotswap' deployment.
   * A 'hotswap' deployment will attempt to short-circuit CloudFormation
   * and update the affected resources like Lambda functions directly.
   *
   * @default - false for regular deployments, true for 'watch' deployments
   */
  readonly hotswap?: boolean;

  /**
   * The extra string to append to the User-Agent header when performing AWS SDK calls.
   *
   * @default - nothing extra is appended to the User-Agent header
   */
  readonly extraUserAgent?: string;

  /**
   * List of existing resources to be IMPORTED into the stack, instead of being CREATED
   */
  readonly resourcesToImport?: ResourcesToImport;

  /**
   * If present, use this given template instead of the stored one
   *
   * @default - Use the stored template
   */
  readonly overrideTemplate?: any;

  /**
   * Whether to build assets before publishing.
   *
   * @default true To remain backward compatible.
   */
  readonly buildAssets?: boolean;

  /**
   * Whether to build/publish assets in parallel
   *
   * @default true To remain backward compatible.
   */
  readonly assetParallelism?: boolean;
}

export interface BuildStackAssetsOptions {
  /**
   * Stack with assets to build.
   */
  readonly stack: cxapi.CloudFormationStackArtifact;

  /**
   * Name of the toolkit stack, if not the default name.
   *
   * @default 'CDKToolkit'
   */
  readonly toolkitStackName?: string;

  /**
   * Execution role for the building.
   *
   * @default - Current role
   */
  readonly roleArn?: string;

  /**
   * Options to pass on to `buildAsests()` function
   */
  readonly buildOptions?: BuildAssetsOptions;
}

interface PublishStackAssetsOptions {
  /**
   * Whether to build assets before publishing.
   *
   * @default true To remain backward compatible.
   */
  readonly buildAssets?: boolean;

  /**
   * Options to pass on to `publishAsests()` function
   */
  readonly publishOptions?: Omit<PublishAssetsOptions, "buildAssets">;
}

export interface DestroyStackOptions {
  stack: cxapi.CloudFormationStackArtifact;
  deployName?: string;
  roleArn?: string;
  quiet?: boolean;
  force?: boolean;
  ci?: boolean;
}

export interface StackExistsOptions {
  stack: cxapi.CloudFormationStackArtifact;
  deployName?: string;
}

export interface ProvisionerProps {
  sdkProvider: SdkProvider;
}

/**
 * SDK obtained by assuming the deploy role
 * for a given environment
 */
export interface PreparedSdkForEnvironment {
  /**
   * The SDK for the given environment
   */
  readonly stackSdk: ISDK;

  /**
   * The resolved environment for the stack
   * (no more 'unknown-account/unknown-region')
   */
  readonly resolvedEnvironment: cxapi.Environment;
  /**
   * The Execution Role that should be passed to CloudFormation.
   *
   * @default - no execution role is used
   */
  readonly cloudFormationRoleArn?: string;
}

/**
 * Helper class for CloudFormation deployments
 *
 * Looks us the right SDK and Bootstrap stack to deploy a given
 * stack artifact.
 */
export class CloudFormationDeployments {
  private readonly sdkProvider: SdkProvider;

  constructor(props: ProvisionerProps) {
    this.sdkProvider = props.sdkProvider;
  }

  public async readCurrentTemplateWithNestedStacks(
    rootStackArtifact: cxapi.CloudFormationStackArtifact,
    retrieveProcessedTemplate: boolean = false
  ): Promise<Template> {
    const sdk = (await this.prepareSdkWithLookupOrDeployRole(rootStackArtifact))
      .stackSdk;
    return (
      await loadCurrentTemplateWithNestedStacks(
        rootStackArtifact,
        sdk,
        retrieveProcessedTemplate
      )
    ).deployedTemplate;
  }

  public async readCurrentTemplate(
    stackArtifact: cxapi.CloudFormationStackArtifact
  ): Promise<Template> {
    debug(`Reading existing template for stack ${stackArtifact.displayName}.`);
    const sdk = (await this.prepareSdkWithLookupOrDeployRole(stackArtifact))
      .stackSdk;
    return loadCurrentTemplate(stackArtifact, sdk);
  }

  public async resourceIdentifierSummaries(
    stackArtifact: cxapi.CloudFormationStackArtifact,
    toolkitStackName?: string
  ): Promise<ResourceIdentifierSummaries> {
    debug(
      `Retrieving template summary for stack ${stackArtifact.displayName}.`
    );
    // Currently, needs to use `deploy-role` since it may need to read templates in the staging
    // bucket which have been encrypted with a KMS key (and lookup-role may not read encrypted things)
    const { stackSdk, resolvedEnvironment } = await this.prepareSdkFor(
      stackArtifact,
      undefined,
      Mode.ForReading
    );
    const cfn = stackSdk.cloudFormation();

    const toolkitInfo = await ToolkitInfo.lookup(
      resolvedEnvironment,
      stackSdk,
      toolkitStackName
    );

    // Upload the template, if necessary, before passing it to CFN
    const cfnParam = await makeBodyParameterAndUpload(
      stackArtifact,
      resolvedEnvironment,
      toolkitInfo,
      this.sdkProvider,
      stackSdk
    );

    const response = await cfn.getTemplateSummary(cfnParam).promise();
    if (!response.ResourceIdentifierSummaries) {
      debug(
        'GetTemplateSummary API call did not return "ResourceIdentifierSummaries"'
      );
    }
    return response.ResourceIdentifierSummaries ?? [];
  }

  public async deployStack(
    options: DeployStackOptions
  ): Promise<DeployStackResult | undefined> {
    let deploymentMethod = options.deploymentMethod;
    if (options.changeSetName || options.execute !== undefined) {
      if (deploymentMethod) {
        throw new Error(
          "You cannot supply both 'deploymentMethod' and 'changeSetName/execute'. Supply one or the other."
        );
      }
      deploymentMethod = {
        method: "change-set",
        changeSetName: options.changeSetName,
        execute: options.execute,
      };
    }

    const { stackSdk, resolvedEnvironment, cloudFormationRoleArn } =
      await this.prepareSdkFor(options.stack, options.roleArn);

    const toolkitInfo = await ToolkitInfo.lookup(
      resolvedEnvironment,
      stackSdk,
      options.toolkitStackName
    );

    // Publish any assets before doing the actual deploy (do not publish any assets on import operation)
    if (options.resourcesToImport === undefined) {
      await this.publishStackAssets(options.stack, toolkitInfo, {
        buildAssets: options.buildAssets ?? true,
        publishOptions: {
          quiet: options.quiet,
          parallel: options.assetParallelism,
        },
      });
    }

    // Do a verification of the bootstrap stack version
    await this.validateBootstrapStackVersion(
      options.stack.stackName,
      options.stack.requiresBootstrapStackVersion,
      options.stack.bootstrapStackVersionSsmParameter,
      toolkitInfo
    );

    return deployStack({
      stack: options.stack,
      noMonitor: true,
      resolvedEnvironment,
      deployName: options.deployName,
      notificationArns: options.notificationArns,
      quiet: options.quiet,
      sdk: stackSdk,
      sdkProvider: this.sdkProvider,
      roleArn: cloudFormationRoleArn,
      reuseAssets: options.reuseAssets,
      toolkitInfo,
      tags: options.tags,
      deploymentMethod,
      force: options.force,
      parameters: options.parameters,
      usePreviousParameters: options.usePreviousParameters,
      progress: options.progress,
      ci: options.ci,
      rollback: options.rollback,
      hotswap: options.hotswap,
      extraUserAgent: options.extraUserAgent,
      resourcesToImport: options.resourcesToImport,
      overrideTemplate: options.overrideTemplate,
      assetParallelism: options.assetParallelism,
    });
  }

  public async destroyStack(options: DestroyStackOptions): Promise<void> {
    const { stackSdk, cloudFormationRoleArn: roleArn } =
      await this.prepareSdkFor(options.stack, options.roleArn);

    return destroyStack({
      sdk: stackSdk,
      roleArn,
      stack: options.stack,
      deployName: options.deployName,
      quiet: options.quiet,
      ci: options.ci,
    });
  }

  public async stackExists(options: StackExistsOptions): Promise<boolean> {
    const { stackSdk } = await this.prepareSdkFor(
      options.stack,
      undefined,
      Mode.ForReading
    );
    const stack = await CloudFormationStack.lookup(
      stackSdk.cloudFormation(),
      options.deployName ?? options.stack.stackName
    );
    return stack.exists;
  }

  private async prepareSdkWithLookupOrDeployRole(
    stackArtifact: cxapi.CloudFormationStackArtifact
  ): Promise<PreparedSdkForEnvironment> {
    // try to assume the lookup role
    try {
      const result = await prepareSdkWithLookupRoleFor(
        this.sdkProvider,
        stackArtifact
      );
      if (result.didAssumeRole) {
        return {
          resolvedEnvironment: result.resolvedEnvironment,
          stackSdk: result.sdk,
        };
      }
    } catch { }
    // fall back to the deploy role
    return this.prepareSdkFor(stackArtifact, undefined, Mode.ForReading);
  }

  /**
   * Get the environment necessary for touching the given stack
   *
   * Returns the following:
   *
   * - The resolved environment for the stack (no more 'unknown-account/unknown-region')
   * - SDK loaded with the right credentials for calling `CreateChangeSet`.
   * - The Execution Role that should be passed to CloudFormation.
   */
  public async prepareSdkFor(
    stack: cxapi.CloudFormationStackArtifact,
    roleArn?: string,
    mode = Mode.ForWriting
  ): Promise<PreparedSdkForEnvironment> {
    if (!stack.environment) {
      throw new Error(
        `The stack ${stack.displayName} does not have an environment`
      );
    }

    const resolvedEnvironment = await this.sdkProvider.resolveEnvironment(
      stack.environment
    );

    // Substitute any placeholders with information about the current environment
    const arns = await replaceEnvPlaceholders(
      {
        assumeRoleArn: stack.assumeRoleArn,

        // Use the override if given, otherwise use the field from the stack
        cloudFormationRoleArn: roleArn ?? stack.cloudFormationExecutionRoleArn,
      },
      resolvedEnvironment,
      this.sdkProvider
    );

    const stackSdk = await this.sdkProvider.forEnvironment(
      resolvedEnvironment,
      mode,
      {
        assumeRoleArn: arns.assumeRoleArn,
        assumeRoleExternalId: stack.assumeRoleExternalId,
      }
    );

    return {
      stackSdk: stackSdk.sdk,
      resolvedEnvironment,
      cloudFormationRoleArn: arns.cloudFormationRoleArn,
    };
  }

  /**
   * Build a stack's assets.
   */
  public async buildStackAssets(options: BuildStackAssetsOptions) {
    const { stackSdk, resolvedEnvironment } = await this.prepareSdkFor(
      options.stack,
      options.roleArn
    );
    const toolkitInfo = await ToolkitInfo.lookup(
      resolvedEnvironment,
      stackSdk,
      options.toolkitStackName
    );

    const stackEnv = await this.sdkProvider.resolveEnvironment(
      options.stack.environment
    );
    const assetArtifacts = options.stack.dependencies.filter(
      cxapi.AssetManifestArtifact.isAssetManifestArtifact
    );

    for (const assetArtifact of assetArtifacts) {
      await this.validateBootstrapStackVersion(
        options.stack.stackName,
        assetArtifact.requiresBootstrapStackVersion,
        assetArtifact.bootstrapStackVersionSsmParameter,
        toolkitInfo
      );

      const manifest = AssetManifest.fromFile(assetArtifact.file);
      await buildAssets(
        manifest,
        this.sdkProvider,
        stackEnv,
        options.buildOptions
      );
    }
  }

  /**
   * Publish all asset manifests that are referenced by the given stack
   */
  public async publishStackAssets(
    stack: cxapi.CloudFormationStackArtifact,
    toolkitInfo: ToolkitInfo,
    options: PublishStackAssetsOptions = {}
  ) {
    const stackEnv = await this.sdkProvider.resolveEnvironment(
      stack.environment
    );
    const assetArtifacts = stack.dependencies.filter(
      cxapi.AssetManifestArtifact.isAssetManifestArtifact
    );

    for (const assetArtifact of assetArtifacts) {
      await this.validateBootstrapStackVersion(
        stack.stackName,
        assetArtifact.requiresBootstrapStackVersion,
        assetArtifact.bootstrapStackVersionSsmParameter,
        toolkitInfo
      );

      const manifest = AssetManifest.fromFile(assetArtifact.file);
      await publishAssets(manifest, this.sdkProvider, stackEnv, {
        ...options.publishOptions,
        buildAssets: options.buildAssets ?? true,
      });
    }
  }

  /**
   * Validate that the bootstrap stack has the right version for this stack
   */
  public async validateBootstrapStackVersion(
    stackName: string,
    requiresBootstrapStackVersion: number | undefined,
    bootstrapStackVersionSsmParameter: string | undefined,
    toolkitInfo: ToolkitInfo
  ) {
    if (requiresBootstrapStackVersion === undefined) {
      return;
    }

    try {
      await toolkitInfo.validateVersion(
        requiresBootstrapStackVersion,
        bootstrapStackVersionSsmParameter
      );
    } catch (e: any) {
      throw new Error(`${stackName}: ${e.message}`);
    }
  }
}
