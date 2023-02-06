import * as cxapi from "@aws-cdk/cx-api";
import type { CloudFormation } from "aws-sdk";
import fs from "fs/promises";
import * as uuid from "uuid";
import { addMetadataAssetsToManifest } from "aws-cdk/lib/assets.js";
import { Tag } from "aws-cdk/lib/cdk-toolkit.js";
import { debug, error, print } from "aws-cdk/lib/logging.js";
import { toYAML } from "aws-cdk/lib/serialize.js";
import { AssetManifestBuilder } from "aws-cdk/lib/util/asset-manifest-builder.js";
import { publishAssets } from "aws-cdk/lib/util/asset-publishing.js";
import { contentHash } from "aws-cdk/lib/util/content-hash.js";
import { ISDK, SdkProvider } from "aws-cdk/lib/api/aws-auth/index.js";
import { CfnEvaluationException } from "aws-cdk/lib/api/evaluate-cloudformation-template.js";
import { tryHotswapDeployment } from "aws-cdk/lib/api/hotswap-deployments.js";
import { ICON } from "aws-cdk/lib/api/hotswap/common.js";
import { ToolkitInfo } from "aws-cdk/lib/api/toolkit-info.js";
import {
  changeSetHasNoChanges,
  CloudFormationStack,
  TemplateParameters,
  waitForChangeSet,
  waitForStackDeploy,
  waitForStackDelete,
  ParameterValues,
  ParameterChanges,
  ResourcesToImport,
} from "aws-cdk/lib/api/util/cloudformation.js";
import {
  // StackActivityMonitor,
  StackActivityProgress,
} from "aws-cdk/lib/api/util/cloudformation/stack-activity-monitor.js";
import { blue } from "colorette";

type TemplateBodyParameter = {
  TemplateBody?: string;
  TemplateURL?: string;
};

export interface DeployStackResult {
  readonly noOp: boolean;
  readonly outputs: { [name: string]: string };
  readonly stackArn: string;
}

export interface DeployStackOptions {
  /**
   * The stack to be deployed
   */
  readonly stack: cxapi.CloudFormationStackArtifact;

  /**
   * Skip monitoring
   */
  readonly noMonitor?: boolean;

  /**
   * The environment to deploy this stack in
   *
   * The environment on the stack artifact may be unresolved, this one
   * must be resolved.
   */
  readonly resolvedEnvironment: cxapi.Environment;

  /**
   * The SDK to use for deploying the stack
   *
   * Should have been initialized with the correct role with which
   * stack operations should be performed.
   */
  readonly sdk: ISDK;

  /**
   * SDK provider (seeded with default credentials)
   *
   * Will exclusively be used to assume publishing credentials (which must
   * start out from current credentials regardless of whether we've assumed an
   * action role to touch the stack or not).
   *
   * Used for the following purposes:
   *
   * - Publish legacy assets.
   * - Upload large CloudFormation templates to the staging bucket.
   */
  readonly sdkProvider: SdkProvider;

  /**
   * Information about the bootstrap stack found in the target environment
   */
  readonly toolkitInfo: ToolkitInfo;

  /**
   * Role to pass to CloudFormation to execute the change set
   *
   * @default - Role specified on stack, otherwise current
   */
  readonly roleArn?: string;

  /**
   * Notification ARNs to pass to CloudFormation to notify when the change set has completed
   *
   * @default - No notifications
   */
  readonly notificationArns?: string[];

  /**
   * Name to deploy the stack under
   *
   * @default - Name from assembly
   */
  readonly deployName?: string;

  /**
   * Quiet or verbose deployment
   *
   * @default false
   */
  readonly quiet?: boolean;

  /**
   * List of asset IDs which shouldn't be built
   *
   * @default - Build all assets
   */
  readonly reuseAssets?: string[];

  /**
   * Tags to pass to CloudFormation to add to stack
   *
   * @default - No tags
   */
  readonly tags?: Tag[];

  /**
   * What deployment method to use
   *
   * @default - Change set with defaults
   */
  readonly deploymentMethod?: DeploymentMethod;

  /**
   * The collection of extra parameters
   * (in addition to those used for assets)
   * to pass to the deployed template.
   * Note that parameters with `undefined` or empty values will be ignored,
   * and not passed to the template.
   *
   * @default - no additional parameters will be passed to the template
   */
  readonly parameters?: { [name: string]: string | undefined };

  /**
   * Use previous values for unspecified parameters
   *
   * If not set, all parameters must be specified for every deployment.
   *
   * @default false
   */
  readonly usePreviousParameters?: boolean;

  /**
   * Display mode for stack deployment progress.
   *
   * @default StackActivityProgress.Bar stack events will be displayed for
   *   the resource currently being deployed.
   */
  readonly progress?: StackActivityProgress;

  /**
   * Deploy even if the deployed template is identical to the one we are about to deploy.
   * @default false
   */
  readonly force?: boolean;

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
   * If set, change set of type IMPORT will be created, and resourcesToImport
   * passed to it.
   */
  readonly resourcesToImport?: ResourcesToImport;

  /**
   * If present, use this given template instead of the stored one
   *
   * @default - Use the stored template
   */
  readonly overrideTemplate?: any;

  /**
   * Whether to build/publish assets in parallel
   *
   * @default true To remain backward compatible.
   */
  readonly assetParallelism?: boolean;
}

export type DeploymentMethod =
  | DirectDeploymentMethod
  | ChangeSetDeploymentMethod;

export interface DirectDeploymentMethod {
  readonly method: "direct";
}

export interface ChangeSetDeploymentMethod {
  readonly method: "change-set";

  /**
   * Whether to execute the changeset or leave it in review.
   *
   * @default true
   */
  readonly execute?: boolean;

  /**
   * Optional name to use for the CloudFormation change set.
   * If not provided, a name will be generated automatically.
   */
  readonly changeSetName?: string;
}

const LARGE_TEMPLATE_SIZE_KB = 50;

export async function deployStack(
  options: DeployStackOptions
): Promise<DeployStackResult | undefined> {
  const stackArtifact = options.stack;

  const stackEnv = options.resolvedEnvironment;

  options.sdk.appendCustomUserAgent(options.extraUserAgent);
  const cfn = options.sdk.cloudFormation();
  const deployName = options.deployName || stackArtifact.stackName;
  let cloudFormationStack = await CloudFormationStack.lookup(cfn, deployName);

  if (cloudFormationStack.stackStatus.isCreationFailure) {
    debug(
      `Found existing stack ${deployName} that had previously failed creation. Deleting it before attempting to re-create it.`
    );
    await cfn.deleteStack({ StackName: deployName }).promise();
    const deletedStack = await waitForStackDelete(cfn, deployName);
    if (deletedStack && deletedStack.stackStatus.name !== "DELETE_COMPLETE") {
      throw new Error(
        `Failed deleting stack ${deployName} that had previously failed creation (current state: ${deletedStack.stackStatus})`
      );
    }
    // Update variable to mark that the stack does not exist anymore, but avoid
    // doing an actual lookup in CloudFormation (which would be silly to do if
    // we just deleted it).
    cloudFormationStack = CloudFormationStack.doesNotExist(cfn, deployName);
  }

  // Detect "legacy" assets (which remain in the metadata) and publish them via
  // an ad-hoc asset manifest, while passing their locations via template
  // parameters.
  const legacyAssets = new AssetManifestBuilder();
  const assetParams = await addMetadataAssetsToManifest(
    stackArtifact,
    legacyAssets,
    options.toolkitInfo,
    options.reuseAssets
  );

  const finalParameterValues = { ...options.parameters, ...assetParams };

  const templateParams = TemplateParameters.fromTemplate(
    stackArtifact.template
  );
  const stackParams = options.usePreviousParameters
    ? templateParams.updateExisting(
        finalParameterValues,
        cloudFormationStack.parameters
      )
    : templateParams.supplyAll(finalParameterValues);

  if (
    await canSkipDeploy(
      options,
      cloudFormationStack,
      stackParams.hasChanges(cloudFormationStack.parameters)
    )
  ) {
    debug(`${deployName}: skipping deployment (use --force to override)`);
    // if we can skip deployment and we are performing a hotswap, let the user know
    // that no hotswap deployment happened
    if (options.hotswap) {
    }
    return {
      noOp: true,
      outputs: cloudFormationStack.outputs,
      stackArn: cloudFormationStack.stackId,
    };
  } else {
    debug(`${deployName}: deploying...`);
  }

  const bodyParameter = await makeBodyParameter(
    stackArtifact,
    options.resolvedEnvironment,
    legacyAssets,
    options.toolkitInfo,
    options.sdk,
    options.overrideTemplate
  );
  await publishAssets(
    legacyAssets.toManifest(stackArtifact.assembly.directory),
    options.sdkProvider,
    stackEnv,
    {
      parallel: options.assetParallelism,
    }
  );

  if (options.hotswap) {
    // attempt to short-circuit the deployment if possible
    try {
      const hotswapDeploymentResult = await tryHotswapDeployment(
        options.sdkProvider,
        assetParams,
        cloudFormationStack,
        stackArtifact
      );
      if (hotswapDeploymentResult) {
        return hotswapDeploymentResult;
      }
      print(
        "Could not perform a hotswap deployment, as the stack %s contains non-Asset changes",
        stackArtifact.displayName
      );
    } catch (e) {
      if (!(e instanceof CfnEvaluationException)) {
        throw e;
      }
      print(
        "Could not perform a hotswap deployment, because the CloudFormation template could not be resolved: %s",
        e.message
      );
    }
    print("Falling back to doing a full deployment");
    options.sdk.appendCustomUserAgent("cdk-hotswap/fallback");
  }

  // could not short-circuit the deployment, perform a full CFN deploy instead
  const fullDeployment = new FullCloudFormationDeployment(
    options,
    cloudFormationStack,
    stackArtifact,
    stackParams,
    bodyParameter
  );
  return fullDeployment.performDeployment();
}

type CommonPrepareOptions = keyof CloudFormation.CreateStackInput &
  keyof CloudFormation.UpdateStackInput &
  keyof CloudFormation.CreateChangeSetInput;
type CommonExecuteOptions = keyof CloudFormation.CreateStackInput &
  keyof CloudFormation.UpdateStackInput &
  keyof CloudFormation.ExecuteChangeSetInput;

/**
 * This class shares state and functionality between the different full deployment modes
 */
class FullCloudFormationDeployment {
  private readonly cfn: ReturnType<ISDK["cloudFormation"]>;
  private readonly stackName: string;
  private readonly update: boolean;
  private readonly verb: string;
  private readonly uuid: string;

  constructor(
    private readonly options: DeployStackOptions,
    private readonly cloudFormationStack: CloudFormationStack,
    private readonly stackArtifact: cxapi.CloudFormationStackArtifact,
    private readonly stackParams: ParameterValues,
    private readonly bodyParameter: TemplateBodyParameter
  ) {
    this.cfn = options.sdk.cloudFormation();
    this.stackName = options.deployName ?? stackArtifact.stackName;

    this.update =
      cloudFormationStack.exists &&
      cloudFormationStack.stackStatus.name !== "REVIEW_IN_PROGRESS";
    this.verb = this.update ? "update" : "create";
    this.uuid = uuid.v4();
  }

  public async performDeployment(): Promise<DeployStackResult | undefined> {
    const deploymentMethod = this.options.deploymentMethod ?? {
      method: "change-set",
    };

    if (
      deploymentMethod.method === "direct" &&
      this.options.resourcesToImport
    ) {
      throw new Error("Importing resources requires a changeset deployment");
    }

    switch (deploymentMethod.method) {
      case "change-set":
        return this.changeSetDeployment(deploymentMethod);

      case "direct":
        return this.directDeployment();
    }
  }

  private async changeSetDeployment(
    deploymentMethod: ChangeSetDeploymentMethod
  ): Promise<DeployStackResult> {
    const changeSetName =
      deploymentMethod.changeSetName ?? "cdk-deploy-change-set";
    const execute = deploymentMethod.execute ?? true;
    const changeSetDescription = await this.createChangeSet(
      changeSetName,
      execute
    );
    await this.updateTerminationProtection();

    if (changeSetHasNoChanges(changeSetDescription)) {
      debug("No changes are to be performed on %s.", this.stackName);
      if (execute) {
        debug("Deleting empty change set %s", changeSetDescription.ChangeSetId);
        await this.cfn
          .deleteChangeSet({
            StackName: this.stackName,
            ChangeSetName: changeSetName,
          })
          .promise();
      }
      return {
        noOp: true,
        outputs: this.cloudFormationStack.outputs,
        stackArn: changeSetDescription.StackId!,
      };
    }

    if (!execute) {
      print(
        "Changeset %s created and waiting in review for manual execution (--no-execute)",
        changeSetDescription.ChangeSetId
      );
      return {
        noOp: false,
        outputs: this.cloudFormationStack.outputs,
        stackArn: changeSetDescription.StackId!,
      };
    }

    return this.executeChangeSet(changeSetDescription);
  }

  private async createChangeSet(changeSetName: string, willExecute: boolean) {
    await this.cleanupOldChangeset(changeSetName);

    debug(
      `Attempting to create ChangeSet with name ${changeSetName} to ${this.verb} stack ${this.stackName}`
    );
    const changeSet = await this.cfn
      .createChangeSet({
        StackName: this.stackName,
        ChangeSetName: changeSetName,
        ChangeSetType: this.options.resourcesToImport
          ? "IMPORT"
          : this.update
          ? "UPDATE"
          : "CREATE",
        ResourcesToImport: this.options.resourcesToImport,
        Description: `CDK Changeset for execution ${this.uuid}`,
        ClientToken: `create${this.uuid}`,
        ...this.commonPrepareOptions(),
      })
      .promise();

    debug(
      "Initiated creation of changeset: %s; waiting for it to finish creating...",
      changeSet.Id
    );
    // Fetching all pages if we'll execute, so we can have the correct change count when monitoring.
    return waitForChangeSet(this.cfn, this.stackName, changeSetName, {
      fetchAll: willExecute,
    });
  }

  private async executeChangeSet(
    changeSet: CloudFormation.DescribeChangeSetOutput
  ): Promise<DeployStackResult> {
    debug(
      "Initiating execution of changeset %s on stack %s",
      changeSet.ChangeSetId,
      this.stackName
    );

    await this.cfn
      .executeChangeSet({
        StackName: this.stackName,
        ChangeSetName: changeSet.ChangeSetName!,
        ClientRequestToken: `exec${this.uuid}`,
        ...this.commonExecuteOptions(),
      })
      .promise();

    debug(
      "Execution of changeset %s on stack %s has started; waiting for the update to complete...",
      changeSet.ChangeSetId,
      this.stackName
    );

    // +1 for the extra event emitted from updates.
    const changeSetLength: number =
      (changeSet.Changes ?? []).length + (this.update ? 1 : 0);
    return this.monitorDeployment(changeSet.CreationTime!, changeSetLength);
  }

  private async cleanupOldChangeset(changeSetName: string) {
    if (this.cloudFormationStack.exists) {
      // Delete any existing change sets generated by CDK since change set names must be unique.
      // The delete request is successful as long as the stack exists (even if the change set does not exist).
      debug(
        `Removing existing change set with name ${changeSetName} if it exists`
      );
      await this.cfn
        .deleteChangeSet({
          StackName: this.stackName,
          ChangeSetName: changeSetName,
        })
        .promise();
    }
  }

  private async updateTerminationProtection() {
    // Update termination protection only if it has changed.
    const terminationProtection =
      this.stackArtifact.terminationProtection ?? false;
    if (
      !!this.cloudFormationStack.terminationProtection !== terminationProtection
    ) {
      debug(
        "Updating termination protection from %s to %s for stack %s",
        this.cloudFormationStack.terminationProtection,
        terminationProtection,
        this.stackName
      );
      await this.cfn
        .updateTerminationProtection({
          StackName: this.stackName,
          EnableTerminationProtection: terminationProtection,
        })
        .promise();
      debug(
        "Termination protection updated to %s for stack %s",
        terminationProtection,
        this.stackName
      );
    }
  }

  private async directDeployment(): Promise<DeployStackResult | undefined> {
    const startTime = new Date();

    if (this.update) {
      await this.cfn
        .updateStack({
          StackName: this.stackName,
          ClientRequestToken: `update${this.uuid}`,
          ...this.commonPrepareOptions(),
          ...this.commonExecuteOptions(),
        })
        .promise();

      if (this.options.noMonitor) return;
      const ret = await this.monitorDeployment(startTime, undefined);
      await this.updateTerminationProtection();
      return ret;
    } else {
      // Take advantage of the fact that we can set termination protection during create
      const terminationProtection =
        this.stackArtifact.terminationProtection ?? false;

      await this.cfn
        .createStack({
          StackName: this.stackName,
          ClientRequestToken: `create${this.uuid}`,
          ...(terminationProtection
            ? { EnableTerminationProtection: true }
            : undefined),
          ...this.commonPrepareOptions(),
          ...this.commonExecuteOptions(),
        })
        .promise();

      if (this.options.noMonitor) return;
      return this.monitorDeployment(startTime, undefined);
    }
  }

  private async monitorDeployment(
    startTime: Date,
    expectedChanges: number | undefined
  ): Promise<DeployStackResult> {
    // const monitor = this.options.quiet
    //   ? undefined
    //   : StackActivityMonitor.withDefaultPrinter(
    //       this.cfn,
    //       this.stackName,
    //       this.stackArtifact,
    //       {
    //         resourcesTotal: expectedChanges,
    //         progress: this.options.progress,
    //         changeSetCreationTime: startTime,
    //         ci: this.options.ci,
    //       }
    //     ).start();

    let finalState = this.cloudFormationStack;
    try {
      const successStack = await waitForStackDeploy(this.cfn, this.stackName);

      // This shouldn't really happen, but catch it anyway. You never know.
      if (!successStack) {
        throw new Error(
          "Stack deploy failed (the stack disappeared while we were deploying it)"
        );
      }
      finalState = successStack;
    } catch (e: any) {
      throw new Error(suffixWithErrors(e.message /*, monitor?.errors*/));
    } finally {
      // await monitor?.stop();
    }
    debug("Stack %s has completed updating", this.stackName);
    return {
      noOp: false,
      outputs: finalState.outputs,
      stackArn: finalState.stackId,
    };
  }

  /**
   * Return the options that are shared between CreateStack, UpdateStack and CreateChangeSet
   */
  private commonPrepareOptions(): Partial<
    Pick<CloudFormation.UpdateStackInput, CommonPrepareOptions>
  > {
    return {
      Capabilities: [
        "CAPABILITY_IAM",
        "CAPABILITY_NAMED_IAM",
        "CAPABILITY_AUTO_EXPAND",
      ],
      NotificationARNs: this.options.notificationArns,
      Parameters: this.stackParams.apiParameters,
      RoleARN: this.options.roleArn,
      TemplateBody: this.bodyParameter.TemplateBody,
      TemplateURL: this.bodyParameter.TemplateURL,
      Tags: this.options.tags,
    };
  }

  /**
   * Return the options that are shared between UpdateStack and CreateChangeSet
   *
   * Be careful not to add in keys for options that aren't used, as the features may not have been
   * deployed everywhere yet.
   */
  private commonExecuteOptions(): Partial<
    Pick<CloudFormation.UpdateStackInput, CommonExecuteOptions>
  > {
    const shouldDisableRollback = this.options.rollback === false;

    return {
      StackName: this.stackName,
      ...(shouldDisableRollback ? { DisableRollback: true } : undefined),
    };
  }
}

/**
 * Prepares the body parameter for +CreateChangeSet+.
 *
 * If the template is small enough to be inlined into the API call, just return
 * it immediately.
 *
 * Otherwise, add it to the asset manifest to get uploaded to the staging
 * bucket and return its coordinates. If there is no staging bucket, an error
 * is thrown.
 *
 * @param stack     the synthesized stack that provides the CloudFormation template
 * @param toolkitInfo information about the toolkit stack
 */
export async function makeBodyParameter(
  stack: cxapi.CloudFormationStackArtifact,
  resolvedEnvironment: cxapi.Environment,
  assetManifest: AssetManifestBuilder,
  toolkitInfo: ToolkitInfo,
  sdk: ISDK,
  overrideTemplate?: any
): Promise<TemplateBodyParameter> {
  // If the template has already been uploaded to S3, just use it from there.
  if (stack.stackTemplateAssetObjectUrl && !overrideTemplate) {
    return {
      TemplateURL: restUrlFromManifest(
        stack.stackTemplateAssetObjectUrl,
        resolvedEnvironment,
        sdk
      ),
    };
  }

  // Otherwise, pass via API call (if small) or upload here (if large)
  const templateJson = toYAML(overrideTemplate ?? stack.template);

  if (templateJson.length <= LARGE_TEMPLATE_SIZE_KB * 1024) {
    return { TemplateBody: templateJson };
  }

  if (!toolkitInfo.found) {
    error(
      `The template for stack "${stack.displayName}" is ${Math.round(
        templateJson.length / 1024
      )}KiB. ` +
        `Templates larger than ${LARGE_TEMPLATE_SIZE_KB}KiB must be uploaded to S3.\n` +
        "Run the following command in order to setup an S3 bucket in this environment, and then re-deploy:\n\n",
      blue(`\t$ cdk bootstrap ${resolvedEnvironment.name}\n`)
    );

    throw new Error(
      'Template too large to deploy ("cdk bootstrap" is required)'
    );
  }

  const templateHash = contentHash(templateJson);
  const key = `cdk/${stack.id}/${templateHash}.yml`;

  let templateFile = stack.templateFile;
  if (overrideTemplate) {
    // Add a variant of this template
    templateFile = `${stack.templateFile}-${templateHash}.yaml`;
    await fs.writeFile(templateFile, templateJson, { encoding: "utf-8" });
  }

  assetManifest.addFileAsset(
    templateHash,
    {
      path: templateFile,
    },
    {
      bucketName: toolkitInfo.bucketName,
      objectKey: key,
    }
  );

  const templateURL = `${toolkitInfo.bucketUrl}/${key}`;
  debug("Storing template in S3 at:", templateURL);
  return { TemplateURL: templateURL };
}

/**
 * Prepare a body parameter for CFN, performing the upload
 *
 * Return it as-is if it is small enough to pass in the API call,
 * upload to S3 and return the coordinates if it is not.
 */
export async function makeBodyParameterAndUpload(
  stack: cxapi.CloudFormationStackArtifact,
  resolvedEnvironment: cxapi.Environment,
  toolkitInfo: ToolkitInfo,
  sdkProvider: SdkProvider,
  sdk: ISDK,
  overrideTemplate?: any
): Promise<TemplateBodyParameter> {
  // We don't have access to the actual asset manifest here, so pretend that the
  // stack doesn't have a pre-published URL.
  const forceUploadStack = Object.create(stack, {
    stackTemplateAssetObjectUrl: { value: undefined },
  });

  const builder = new AssetManifestBuilder();
  const bodyparam = await makeBodyParameter(
    forceUploadStack,
    resolvedEnvironment,
    builder,
    toolkitInfo,
    sdk,
    overrideTemplate
  );
  const manifest = builder.toManifest(stack.assembly.directory);
  await publishAssets(manifest, sdkProvider, resolvedEnvironment, {
    quiet: true,
  });
  return bodyparam;
}

export interface DestroyStackOptions {
  /**
   * The stack to be destroyed
   */
  stack: cxapi.CloudFormationStackArtifact;

  sdk: ISDK;
  roleArn?: string;
  deployName?: string;
  quiet?: boolean;
  ci?: boolean;
}

export async function destroyStack(options: DestroyStackOptions) {
  const deployName = options.deployName || options.stack.stackName;
  const cfn = options.sdk.cloudFormation();

  const currentStack = await CloudFormationStack.lookup(cfn, deployName);
  if (!currentStack.exists) {
    return;
  }
  /*
  const monitor = options.quiet
    ? undefined
    : StackActivityMonitor.withDefaultPrinter(cfn, deployName, options.stack, {
        ci: options.ci,
      }).start();
  */

  try {
    await cfn
      .deleteStack({ StackName: deployName, RoleARN: options.roleArn })
      .promise();
    const destroyedStack = await waitForStackDelete(cfn, deployName);
    if (
      destroyedStack &&
      destroyedStack.stackStatus.name !== "DELETE_COMPLETE"
    ) {
      throw new Error(
        `Failed to destroy ${deployName}: ${destroyedStack.stackStatus}`
      );
    }
  } catch (e: any) {
    throw new Error(suffixWithErrors(e.message /* , monitor?.errors */));
  } finally {
    /*
    if (monitor) {
      await monitor.stop();
    }
    */
  }
}

/**
 * Checks whether we can skip deployment
 *
 * We do this in a complicated way by preprocessing (instead of just
 * looking at the changeset), because if there are nested stacks involved
 * the changeset will always show the nested stacks as needing to be
 * updated, and the deployment will take a long time to in effect not
 * do anything.
 */
async function canSkipDeploy(
  deployStackOptions: DeployStackOptions,
  cloudFormationStack: CloudFormationStack,
  parameterChanges: ParameterChanges
): Promise<boolean> {
  const deployName =
    deployStackOptions.deployName || deployStackOptions.stack.stackName;
  debug(`${deployName}: checking if we can skip deploy`);

  // Forced deploy
  if (deployStackOptions.force) {
    debug(`${deployName}: forced deployment`);
    return false;
  }

  // Creating changeset only (default true), never skip
  if (
    deployStackOptions.deploymentMethod?.method === "change-set" &&
    deployStackOptions.deploymentMethod.execute === false
  ) {
    debug(`${deployName}: --no-execute, always creating change set`);
    return false;
  }

  // No existing stack
  if (!cloudFormationStack.exists) {
    debug(`${deployName}: no existing stack`);
    return false;
  }

  // SST check: stack is not busy
  if (cloudFormationStack.stackStatus.isInProgress) {
    debug(`${deployName}: stack is busy`);
    return false;
  }

  // Template has changed (assets taken into account here)
  if (
    JSON.stringify(deployStackOptions.stack.template) !==
    JSON.stringify(await cloudFormationStack.template())
  ) {
    debug(`${deployName}: template has changed`);
    return false;
  }

  // Tags have changed
  if (!compareTags(cloudFormationStack.tags, deployStackOptions.tags ?? [])) {
    debug(`${deployName}: tags have changed`);
    return false;
  }

  // Termination protection has been updated
  if (
    !!deployStackOptions.stack.terminationProtection !==
    !!cloudFormationStack.terminationProtection
  ) {
    debug(`${deployName}: termination protection has been updated`);
    return false;
  }

  // Parameters have changed
  if (parameterChanges) {
    if (parameterChanges === "ssm") {
      debug(
        `${deployName}: some parameters come from SSM so we have to assume they may have changed`
      );
    } else {
      debug(`${deployName}: parameters have changed`);
    }
    return false;
  }

  // Existing stack is in a failed state
  if (cloudFormationStack.stackStatus.isFailure) {
    debug(`${deployName}: stack is in a failure state`);
    return false;
  }

  // We can skip deploy
  return true;
}

/**
 * Compares two list of tags, returns true if identical.
 */
function compareTags(a: Tag[], b: Tag[]): boolean {
  if (a.length !== b.length) {
    return false;
  }

  for (const aTag of a) {
    const bTag = b.find((tag) => tag.Key === aTag.Key);

    if (!bTag || bTag.Value !== aTag.Value) {
      return false;
    }
  }

  return true;
}

/**
 * Format an S3 URL in the manifest for use with CloudFormation
 *
 * Replaces environment placeholders (which this field may contain),
 * and reformats s3://.../... urls into S3 REST URLs (which CloudFormation
 * expects)
 */
function restUrlFromManifest(
  url: string,
  environment: cxapi.Environment,
  sdk: ISDK
): string {
  const doNotUseMarker = "**DONOTUSE**";
  // This URL may contain placeholders, so still substitute those.
  url = cxapi.EnvironmentPlaceholders.replace(url, {
    accountId: environment.account,
    region: environment.region,
    partition: doNotUseMarker,
  });

  // Yes, this is extremely crude, but we don't actually need this so I'm not inclined to spend
  // a lot of effort trying to thread the right value to this location.
  if (url.indexOf(doNotUseMarker) > -1) {
    throw new Error(
      "Cannot use '${AWS::Partition}' in the 'stackTemplateAssetObjectUrl' field"
    );
  }

  const s3Url = url.match(/s3:\/\/([^/]+)\/(.*)$/);
  if (!s3Url) {
    return url;
  }

  // We need to pass an 'https://s3.REGION.amazonaws.com[.cn]/bucket/object' URL to CloudFormation, but we
  // got an 's3://bucket/object' URL instead. Construct the rest API URL here.
  const bucketName = s3Url[1];
  const objectKey = s3Url[2];

  const urlSuffix: string = sdk.getEndpointSuffix(environment.region);
  return `https://s3.${environment.region}.${urlSuffix}/${bucketName}/${objectKey}`;
}

function suffixWithErrors(msg: string, errors?: string[]) {
  return errors && errors.length > 0 ? `${msg}: ${errors.join(", ")}` : msg;
}
