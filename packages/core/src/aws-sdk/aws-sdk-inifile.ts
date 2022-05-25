// @ts-nocheck
/* eslint-disable */
import AWS from "aws-sdk";

/**
 * Hack-fix
 *
 * There are a number of issues in the upstream version of SharedIniFileCredentials
 * that need fixing:
 *
 *  1. The upstream aws-sdk contains an incorrect instantiation of an `AWS.STS`
 *     client, which *should* have taken the region from the requested profile
 *     but doesn't. It will use the region from the default profile, which
 *     may not exist, defaulting to `us-east-1` (since we switched to
 *     AWS_STS_REGIONAL_ENDPOINTS=regional, that default is not even allowed anymore
 *     and the absence of a default region will lead to an error).
 *
 *  2. The simple fix is to get the region from the `config` file. profiles
 *     are made up of a combination of `credentials` and `config`, and the region is
 *     generally in `config` with the rest in `credentials`. However, a bug in
 *     `getProfilesFromSharedConfig` overwrites ALL `config` data with `credentials`
 *     data, so we also need to do extra work to fish the `region` out of the config.
 *
 * 3.  The 'credential_source' option is not supported. Meaning credentials
 *     for assume-role cannot be fetched using EC2/ESC metadata.
 *
 * See https://github.com/aws/aws-sdk-js/issues/3418 for all the gory details.
 * See https://github.com/aws/aws-sdk-js/issues/1916 for some more glory details.
 */
export class PatchedSharedIniFileCredentials extends AWS.SharedIniFileCredentials {
  private declare profile: string;
  private declare filename: string;
  private declare disableAssumeRole: boolean;
  private declare options: Record<string, string>;
  private declare roleArn: string;
  private declare httpOptions?: AWS.HTTPOptions;
  private declare tokenCodeFn?: (
    mfaSerial: string,
    callback: (err?: Error, token?: string) => void
  ) => void;

  public loadRoleProfile(
    creds: Record<string, Record<string, string>>,
    roleProfile: Record<string, string>,
    callback: (err?: Error, data?: any) => void
  ) {
    // Need to duplicate the whole implementation here -- the function is long and has been written in
    // such a way that there are no small monkey patches possible.

    if (this.disableAssumeRole) {
      throw (AWS as any).util.error(
        new Error(
          "Role assumption profiles are disabled. " +
            "Failed to load profile " +
            this.profile +
            " from " +
            creds.filename
        ),
        { code: "SharedIniFileCredentialsProviderFailure" }
      );
    }

    var self = this;
    var roleArn = roleProfile.role_arn;
    var roleSessionName = roleProfile.role_session_name;
    var externalId = roleProfile.external_id;
    var mfaSerial = roleProfile.mfa_serial;
    var sourceProfile = roleProfile.source_profile;
    var credentialSource = roleProfile.credential_source;

    const credentialError = (AWS as any).util.error(
      new Error(
        `When using 'role_arn' in profile ('${this.profile}'), you must also configure exactly one of 'source_profile' or 'credential_source'`
      ),
      { code: "SharedIniFileCredentialsProviderFailure" }
    );

    if (sourceProfile && credentialSource) {
      throw credentialError;
    }

    if (!sourceProfile && !credentialSource) {
      throw credentialError;
    }

    const profiles = loadProfilesProper(this.filename);
    const region =
      profiles[this.profile]?.region ?? profiles.default?.region ?? "us-east-1";

    const stsCreds = sourceProfile
      ? this.sourceProfileCredentials(sourceProfile, creds)
      : this.credentialSourceCredentials(credentialSource);

    this.roleArn = roleArn;
    var sts = new AWS.STS({
      credentials: stsCreds,
      region,
      httpOptions: this.httpOptions,
    });

    var roleParams: AWS.STS.AssumeRoleRequest = {
      RoleArn: roleArn,
      RoleSessionName: roleSessionName || "aws-sdk-js-" + Date.now(),
    };

    if (externalId) {
      roleParams.ExternalId = externalId;
    }

    if (mfaSerial && self.tokenCodeFn) {
      roleParams.SerialNumber = mfaSerial;
      self.tokenCodeFn(mfaSerial, function (err, token) {
        if (err) {
          var message;
          if (err instanceof Error) {
            message = err.message;
          } else {
            message = err;
          }
          callback(
            (AWS as any).util.error(
              new Error("Error fetching MFA token: " + message),
              { code: "SharedIniFileCredentialsProviderFailure" }
            )
          );
          return;
        }

        roleParams.TokenCode = token;
        sts.assumeRole(roleParams, callback);
      });
      return;
    }
    sts.assumeRole(roleParams, callback);
  }

  private sourceProfileCredentials(
    sourceProfile: string,
    profiles: Record<string, Record<string, string>>
  ) {
    var sourceProfileExistanceTest = profiles[sourceProfile];

    if (typeof sourceProfileExistanceTest !== "object") {
      throw (AWS as any).util.error(
        new Error(
          "source_profile " +
            sourceProfile +
            " using profile " +
            this.profile +
            " does not exist"
        ),
        { code: "SharedIniFileCredentialsProviderFailure" }
      );
    }

    return new AWS.SharedIniFileCredentials(
      (AWS as any).util.merge(this.options || {}, {
        profile: sourceProfile,
        preferStaticCredentials: true,
      })
    );
  }

  // the aws-sdk for js does not support 'credential_source' (https://github.com/aws/aws-sdk-js/issues/1916)
  // so unfortunately we need to implement this ourselves.
  private credentialSourceCredentials(sourceCredential: string) {
    // see https://docs.aws.amazon.com/credref/latest/refdocs/setting-global-credential_source.html
    switch (sourceCredential) {
      case "Environment": {
        return new AWS.EnvironmentCredentials("AWS");
      }
      case "Ec2InstanceMetadata": {
        return new AWS.EC2MetadataCredentials();
      }
      case "EcsContainer": {
        return new AWS.ECSCredentials();
      }
      default: {
        throw new Error(
          `credential_source ${sourceCredential} in profile ${this.profile} is unsupported. choose one of [Environment, Ec2InstanceMetadata, EcsContainer]`
        );
      }
    }
  }
}

/**
 * A function to load profiles from disk that MERGES credentials and config instead of overwriting
 *
 * @see https://github.com/aws/aws-sdk-js/blob/5ae5a7d7d24d1000dbc089cc15f8ed2c7b06c542/lib/util.js#L956
 */
function loadProfilesProper(filename: string) {
  const util = (AWS as any).util; // Does exists even though there aren't any typings for it
  const iniLoader = util.iniLoader;
  const profiles: Record<string, Record<string, string>> = {};
  let profilesFromConfig: Record<string, Record<string, string>> = {};
  if (process.env[util.configOptInEnv]) {
    profilesFromConfig = iniLoader.loadFrom({
      isConfig: true,
      filename: process.env[util.sharedConfigFileEnv],
    });
  }
  var profilesFromCreds: Record<
    string,
    Record<string, string>
  > = iniLoader.loadFrom({
    filename:
      filename ||
      (process.env[util.configOptInEnv] &&
        process.env[util.sharedCredentialsFileEnv]),
  });
  for (const [name, profile] of Object.entries(profilesFromConfig)) {
    profiles[name] = profile;
  }
  for (const [name, profile] of Object.entries(profilesFromCreds)) {
    profiles[name] = {
      ...profiles[name],
      ...profile,
    };
  }
  return profiles;
}
