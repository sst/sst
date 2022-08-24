import url from "url";
import chalk from "chalk";
import path from "path";
import SSM from "aws-sdk/clients/ssm.js";
import { getChildLogger } from "../logger.js";
import {
  synth,
  deploy,
  isRetryableException,
  STACK_DEPLOY_STATUS
} from "../index.js";

const logger = getChildLogger("bootstrap");
const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

export const LATEST_VERSION = "3";
export const SSM_NAME_VERSION = `/sst/bootstrap/version`;
export const SSM_NAME_STACK_NAME = `/sst/bootstrap/stack-name`;
export const SSM_NAME_BUCKET_NAME = `/sst/bootstrap/bucket-name`;

export interface Assets {
  version?: string;
  stackName?: string;
  bucketName?: string;
}

interface BootstrapOptions {
  tags?: Record<string, string>;
  force?: boolean;
}

export const assets: Assets = {};

export async function bootstrap(config: any, cliInfo: any, options?: BootstrapOptions) {
  const { region } = config;
  const { tags, force } = options || {};

  // Check bootstrap version
  if (!force) {
    await init(region);
    const bootstrapVersion = assets.version;
    if (isVersionUpToDate(bootstrapVersion)) {
      return;
    }
  }

  await deployStack(config, cliInfo, tags || {});
  
  // Check bootstrap version again
  await init(region);
  const bootstrapVersionNew = assets.version;
  if (!isVersionUpToDate(bootstrapVersionNew)) {
    throw new Error(`Failed to update the bootstrap version.`);
  }
}

function isVersionUpToDate(bootstrapVersion?: string) {
  return parseInt(bootstrapVersion || "0") === parseInt(LATEST_VERSION);
}

export async function init(region: string) {
  const ssm = new SSM({ region });

  // Note: When running tests in CI, there is no AWS credentials
  //       and the SSM parameters are not available. Need to fake
  //       the Bootstrap values.
  if (process.env.__TEST__) {
    assets.version = LATEST_VERSION;
    assets.stackName = "sst-bootstrap";
    assets.bucketName = "sst-bootstrap";
    return;
  }

  try {
    const ret = await ssm.getParameters({
      Names: [
        SSM_NAME_VERSION,
        SSM_NAME_STACK_NAME,
        SSM_NAME_BUCKET_NAME,
      ],
    }).promise();
    (ret.Parameters || []).forEach(p => {
      if (p.Name === SSM_NAME_VERSION) {
        assets.version = p.Value;
      } else if (p.Name === SSM_NAME_STACK_NAME) {
        assets.stackName = p.Value;
      } else if (p.Name === SSM_NAME_BUCKET_NAME) {
        assets.bucketName = p.Value;
      }
    });
  } catch(e: any) {
    if (isRetryableException(e)) {
      await init(region);
    }
    throw e;
  }
}

async function deployStack(config: any, cliInfo: any, tags: Record<string, string>) {
  const { region } = config;
  logger.info(chalk.grey(`Bootstrapping SST in the "${region}" region`));

  const cdkOptions = {
    ...cliInfo.cdkOptions,
    app: [
      "node",
      "bin/index.mjs",
      region,
      `${Buffer.from(JSON.stringify(tags)).toString("base64")}`,
    ].join(" "),
    output: "cdk.out",
  };

  // Change working directory
  // Note: When deploying the debug stack, the current working directory is user's app.
  //       Setting the current working directory to debug stack cdk app directory to allow
  //       Lambda Function construct be able to reference code with relative path.
  const appPath = process.cwd();
  process.chdir(path.join(__dirname, "../../assets/bootstrap/cdk-app"));

  // Build
  await synth(cdkOptions);

  // Deploy
  const deployRet = await deploy(cdkOptions);

  logger.debug("deployRet", deployRet);

  // Restore working directory
  process.chdir(appPath);

  // Ensure bootstrap succeeded
  if (
    !deployRet ||
    deployRet.length !== 1 ||
    deployRet[0].status === STACK_DEPLOY_STATUS.FAILED
  ) {
    printStackDeployError(deployRet[0]);
    throw new Error("Failed to run SST bootstrap.");
  }
}

function printStackDeployError(deployRet: any) {
  const { name, errorMessage, errorHelper } = deployRet;
  logger.info(`\nStack ${name}`);
  if (errorMessage) {
    logger.info(`  Error: ${errorMessage}`);
  }
  if (errorHelper) {
    logger.info(`  Helper: ${errorHelper}`);
  }
}

export * as Bootstrap from "./index.js";