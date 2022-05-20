import * as child_process from "child_process";
import * as os from "os";
import * as path from "path";
import * as util from "util";
import AWS from "aws-sdk";
import fs from "fs-extra";
import * as readline from "readline";
import { PatchedSharedIniFileCredentials } from "./aws-sdk-inifile.js";
import { SharedIniFile } from "./sdk_ini_file.js";
import { getChildLogger } from "../logger.js";
const logger = getChildLogger("aws-auth");

/**
 * Behaviors to match AWS CLI
 *
 * See these links:
 *
 * https://docs.aws.amazon.com/cli/latest/topic/config-vars.html
 * https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-envvars.html
 */
export class AwsCliCompatible {
  /**
   * Build an AWS CLI-compatible credential chain provider
   *
   * This is similar to the default credential provider chain created by the SDK
   * except:
   *
   * 1. Accepts profile argument in the constructor (the SDK must have it prepopulated
   *    in the environment).
   * 2. Conditionally checks EC2 credentials, because checking for EC2
   *    credentials on a non-EC2 machine may lead to long delays (in the best case)
   *    or an exception (in the worst case).
   * 3. Respects $AWS_SHARED_CREDENTIALS_FILE.
   * 4. Respects $AWS_DEFAULT_PROFILE in addition to $AWS_PROFILE.
   */
  public static async credentialChain(options: CredentialChainOptions = {}) {
    // Force reading the `config` file if it exists by setting the appropriate
    // environment variable.
    await forceSdkToReadConfigIfPresent();

    // To match AWS CLI behavior, if a profile is explicitly given using --profile,
    // we use that to the exclusion of everything else (note: this does not apply
    // to AWS_PROFILE, environment credentials still take precedence over AWS_PROFILE)
    if (options.profile) {
      return new AWS.CredentialProviderChain(
        iniFileCredentialFactories(options.profile)
      );
    }

    const implicitProfile =
      process.env.AWS_PROFILE || process.env.AWS_DEFAULT_PROFILE || "default";

    const sources = [
      () => new AWS.EnvironmentCredentials("AWS"),
      () => new AWS.EnvironmentCredentials("AMAZON"),
      ...iniFileCredentialFactories(implicitProfile),
    ];

    if (await fs.pathExists(credentialsFileName())) {
      // Force reading the `config` file if it exists by setting the appropriate
      // environment variable.
      await forceSdkToReadConfigIfPresent();
      sources.push(() => profileCredentials(implicitProfile));
      sources.push(
        () => new AWS.ProcessCredentials({ profile: implicitProfile })
      );
    }

    if (options.containerCreds ?? hasEcsCredentials()) {
      sources.push(() => new AWS.ECSCredentials());
    } else if (hasWebIdentityCredentials()) {
      // else if: we have found WebIdentityCredentials as provided by EKS ServiceAccounts
      sources.push(() => new AWS.TokenFileWebIdentityCredentials());
    } else if (options.ec2instance ?? (await isEc2Instance())) {
      // else if: don't get EC2 creds if we should have gotten ECS or EKS creds
      // ECS and EKS instances also run on EC2 boxes but the creds represent something different.
      // Same behavior as upstream code.
      sources.push(() => new AWS.EC2MetadataCredentials());
    }

    return new AWS.CredentialProviderChain(sources);

    function profileCredentials(profileName: string) {
      return new PatchedSharedIniFileCredentials({
        profile: profileName,
        filename: credentialsFileName(),
        httpOptions: options.httpOptions,
        tokenCodeFn,
      });
    }

    function iniFileCredentialFactories(theProfile: string) {
      return [
        () => profileCredentials(theProfile),
        () => new AWS.SsoCredentials({ profile: theProfile }),
        () => new AWS.ProcessCredentials({ profile: theProfile }),
      ];
    }
  }

  /**
   * Return the default region in a CLI-compatible way
   *
   * Mostly copied from node_loader.js, but with the following differences to make it
   * AWS CLI compatible:
   *
   * 1. Takes a profile name as an argument (instead of forcing it to be taken from $AWS_PROFILE).
   *    This requires having made a copy of the SDK's `SharedIniFile` (the original
   *    does not take an argument).
   * 2. $AWS_DEFAULT_PROFILE and $AWS_DEFAULT_REGION are also respected.
   *
   * Lambda and CodeBuild set the $AWS_REGION variable.
   */
  public static async region(options: RegionOptions = {}): Promise<string> {
    const profile =
      options.profile ||
      process.env.AWS_PROFILE ||
      process.env.AWS_DEFAULT_PROFILE ||
      "default";

    // Defaults inside constructor
    const toCheck = [
      { filename: credentialsFileName(), profile },
      { isConfig: true, filename: configFileName(), profile },
      { isConfig: true, filename: configFileName(), profile: "default" },
    ];

    let region =
      process.env.AWS_REGION ||
      process.env.AMAZON_REGION ||
      process.env.AWS_DEFAULT_REGION ||
      process.env.AMAZON_DEFAULT_REGION;

    while (!region && toCheck.length > 0) {
      const opts = toCheck.shift()!;
      if (await fs.pathExists(opts.filename)) {
        const configFile = new SharedIniFile(opts);
        const section = await configFile.getProfile(opts.profile);
        region = section?.region;
      }
    }

    if (!region && (options.ec2instance ?? (await isEc2Instance()))) {
      logger.debug(
        "Looking up AWS region in the EC2 Instance Metadata Service (IMDS)."
      );
      const imdsOptions = {
        httpOptions: { timeout: 1000, connectTimeout: 1000 },
        maxRetries: 2,
      };
      const metadataService = new AWS.MetadataService(imdsOptions);

      let token;
      try {
        token = await getImdsV2Token(metadataService);
      } catch (e) {
        logger.debug(`No IMDSv2 token: ${e}`);
      }

      try {
        region = await getRegionFromImds(metadataService, token);
        logger.debug(`AWS region from IMDS: ${region}`);
      } catch (e) {
        logger.debug(`Unable to retrieve AWS region from IMDS: ${e}`);
      }
    }

    if (!region) {
      const usedProfile = !profile ? "" : ` (profile: "${profile}")`;
      region = "us-east-1"; // This is what the AWS CLI does
      logger.debug(
        `Unable to determine AWS region from environment or AWS configuration${usedProfile}, defaulting to '${region}'`
      );
    }

    return region;
  }
}

/**
 * Return whether it looks like we'll have ECS credentials available
 */
function hasEcsCredentials(): boolean {
  return (AWS.ECSCredentials.prototype as any).isConfiguredForEcsCredentials();
}

/**
 * Return whether it looks like we'll have WebIdentityCredentials (that's what EKS uses) available
 * No check like hasEcsCredentials available, so have to implement our own.
 * @see https://github.com/aws/aws-sdk-js/blob/3ccfd94da07234ae87037f55c138392f38b6881d/lib/credentials/token_file_web_identity_credentials.js#L59
 */
function hasWebIdentityCredentials(): boolean {
  return Boolean(
    process.env.AWS_ROLE_ARN && process.env.AWS_WEB_IDENTITY_TOKEN_FILE
  );
}

/**
 * Return whether we're on an EC2 instance
 */
async function isEc2Instance() {
  if (isEc2InstanceCache === undefined) {
    logger.debug("Determining if we're on an EC2 instance.");
    let instance = false;
    if (process.platform === "win32") {
      // https://docs.aws.amazon.com/AWSEC2/latest/WindowsGuide/identify_ec2_instances.html
      try {
        const result = await util.promisify(child_process.exec)(
          "wmic path win32_computersystemproduct get uuid",
          { encoding: "utf-8" }
        );
        // output looks like
        //  UUID
        //  EC2AE145-D1DC-13B2-94ED-01234ABCDEF
        const lines = result.stdout.toString().split("\n");
        instance = lines.some((x) => matchesRegex(/^ec2/i, x));
      } catch (e: any) {
        // Modern machines may not have wmic.exe installed. No reason to fail, just assume it's not an EC2 instance.
        logger.debug(
          `Checking using WMIC failed, assuming NOT an EC2 instance: ${e.message} (pass --ec2creds to force)`
        );
        instance = false;
      }
    } else {
      // https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/identify_ec2_instances.html
      const files: Array<[string, RegExp]> = [
        // This recognizes the Xen hypervisor based instances (pre-5th gen)
        ["/sys/hypervisor/uuid", /^ec2/i],

        // This recognizes the new Hypervisor (5th-gen instances and higher)
        // Can't use the advertised file '/sys/devices/virtual/dmi/id/product_uuid' because it requires root to read.
        // Instead, sys_vendor contains something like 'Amazon EC2'.
        ["/sys/devices/virtual/dmi/id/sys_vendor", /ec2/i],
      ];
      for (const [file, re] of files) {
        if (matchesRegex(re, readIfPossible(file))) {
          instance = true;
          break;
        }
      }
    }
    logger.debug(
      instance
        ? "Looks like an EC2 instance."
        : "Does not look like an EC2 instance."
    );
    isEc2InstanceCache = instance;
  }
  return isEc2InstanceCache;
}

let isEc2InstanceCache: boolean | undefined = undefined;

/**
 * Attempts to get a Instance Metadata Service V2 token
 */
async function getImdsV2Token(
  metadataService: AWS.MetadataService
): Promise<string> {
  logger.debug("Attempting to retrieve an IMDSv2 token.");
  return new Promise((resolve, reject) => {
    metadataService.request(
      "/latest/api/token",
      {
        method: "PUT",
        headers: { "x-aws-ec2-metadata-token-ttl-seconds": "60" },
      },
      (err: AWS.AWSError, token: string | undefined) => {
        if (err) {
          reject(err);
        } else if (!token) {
          reject(new Error("IMDS did not return a token."));
        } else {
          resolve(token);
        }
      }
    );
  });
}

/**
 * Attempts to get the region from the Instance Metadata Service
 */
async function getRegionFromImds(
  metadataService: AWS.MetadataService,
  token: string | undefined
): Promise<string> {
  logger.debug("Retrieving the AWS region from the IMDS.");
  let options: {
    method?: string | undefined;
    headers?: { [key: string]: string } | undefined;
  } = {};
  if (token) {
    options = { headers: { "x-aws-ec2-metadata-token": token } };
  }
  return new Promise((resolve, reject) => {
    metadataService.request(
      "/latest/dynamic/instance-identity/document",
      options,
      (err: AWS.AWSError, instanceIdentityDocument: string | undefined) => {
        if (err) {
          reject(err);
        } else if (!instanceIdentityDocument) {
          reject(
            new Error("IMDS did not return an Instance Identity Document.")
          );
        } else {
          try {
            resolve(JSON.parse(instanceIdentityDocument).region);
          } catch (e) {
            reject(e);
          }
        }
      }
    );
  });
}

function homeDir() {
  return (
    process.env.HOME ||
    process.env.USERPROFILE ||
    (process.env.HOMEPATH
      ? (process.env.HOMEDRIVE || "C:/") + process.env.HOMEPATH
      : null) ||
    os.homedir()
  );
}

function credentialsFileName() {
  return (
    process.env.AWS_SHARED_CREDENTIALS_FILE ||
    path.join(homeDir(), ".aws", "credentials")
  );
}

function configFileName() {
  return process.env.AWS_CONFIG_FILE || path.join(homeDir(), ".aws", "config");
}

/**
 * Force the JS SDK to honor the ~/.aws/config file (and various settings therein)
 *
 * For example, there is just *NO* way to do AssumeRole credentials as long as AWS_SDK_LOAD_CONFIG is not set,
 * or read credentials from that file.
 *
 * The SDK crashes if the variable is set but the file does not exist, so conditionally set it.
 */
async function forceSdkToReadConfigIfPresent() {
  if (await fs.pathExists(configFileName())) {
    process.env.AWS_SDK_LOAD_CONFIG = "1";
  }
}

function matchesRegex(re: RegExp, s: string | undefined) {
  return s !== undefined && re.exec(s) !== null;
}

/**
 * Read a file if it exists, or return undefined
 *
 * Not async because it is used in the constructor
 */
function readIfPossible(filename: string): string | undefined {
  try {
    if (!fs.pathExistsSync(filename)) {
      return undefined;
    }
    return fs.readFileSync(filename, { encoding: "utf-8" });
  } catch (e) {
    logger.debug(e);
    return undefined;
  }
}

export interface CredentialChainOptions {
  readonly profile?: string;
  readonly ec2instance?: boolean;
  readonly containerCreds?: boolean;
  readonly httpOptions?: AWS.HTTPOptions;
}

export interface RegionOptions {
  readonly profile?: string;
  readonly ec2instance?: boolean;
}

/**
 * Ask user for MFA token for given serial
 *
 * Result is send to callback function for SDK to authorize the request
 */
async function tokenCodeFn(
  serialArn: string,
  cb: (err?: Error, token?: string) => void
): Promise<void> {
  logger.debug(`Require MFA token for serial ARN ${serialArn}`);
  try {
    //const token: string = await promptly.prompt(`MFA token for ${serialArn}: `, {
    //  trim: true,
    //  default: '',
    //});
    const token = await promptToken(serialArn);
    logger.debug("Successfully got MFA token from user");
    cb(undefined, token);
  } catch (e: any) {
    logger.debug(`Failed to get MFA token ${e}`);
    cb(e);
  }
}

async function promptToken(serialArn: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(`MFA token for ${serialArn}: `, (input) => {
      rl.close();
      resolve(input.trim() || "");
    });
  });
}
