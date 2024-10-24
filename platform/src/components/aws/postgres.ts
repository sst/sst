import {
  all,
  ComponentResourceOptions,
  interpolate,
  jsonStringify,
  output,
  Output,
} from "@pulumi/pulumi";
import { Component, Transform, transform } from "../component";
import { Link } from "../link";
import { Input } from "../input.js";
import { iam, rds, secretsmanager } from "@pulumi/aws";
import { RandomPassword } from "@pulumi/random";
import { Vpc } from "./vpc";
import { Vpc as VpcV1 } from "./vpc-v1";
import { VisibleError } from "../error";
import { Postgres as PostgresV1 } from "./postgres-v1";
import { SizeGbTb, toGBs } from "../size";
export type { PostgresArgs as PostgresV1Args } from "./postgres-v1";

export interface PostgresArgs {
  /**
   * The Postgres engine version. Check out the [available versions in your region](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/PostgreSQL.Concepts.General.DBVersions.html).
   * @default `"16.4"`
   * @example
   * ```js
   * {
   *   version: "15.8"
   * }
   * ```
   */
  version?: Input<string>;
  /**
   * The username of the master user.
   *
   * :::caution
   * Changing the username will cause the database to be destroyed and recreated.
   * :::
   *
   * @default `"postgres"`
   * @example
   * ```js
   * {
   *   username: "admin"
   * }
   * ```
   */
  username?: Input<string>;
  /**
   * The password of the master user.
   * @default A random password is generated.
   * @example
   * ```js
   * {
   *   password: "Passw0rd!"
   * }
   * ```
   */
  password?: Input<string>;
  /**
   * Name of a database that is automatically created.
   *
   * The name must begin with a letter and contain only lowercase letters, numbers, or
   * underscores. By default, it takes the name of the app, and replaces the hyphens with
   * underscores.
   *
   * @default Based on the name of the current app
   * @example
   * ```js
   * {
   *   database: "acme"
   * }
   * ```
   */
  database?: Input<string>;
  /**
   * The type of instance to use for the database. Check out the [supported instance types](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Concepts.DBInstanceClass.Types.html).
   *
   * @default `"t4g.micro"`
   * @example
   * ```js
   * {
   *   instance: "m7g.xlarge"
   * }
   * ```
   */
  instance?: Input<string>;
  /**
   * The amount of storage to use for the database.
   *
   * By default, [gp3 storage volumes](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_Storage.html#Concepts.Storage.GeneralSSD)
   * are used without additional provisioned IOPS. This provides a good baseline performance
   * for most use cases.
   *
   * The minimum storage size is 20 GB. And the maximum storage size is 64 TB.
   *
   * @default `"20 GB"`
   * @example
   * ```js
   * {
   *   storage: "100 GB"
   * }
   * ```
   */
  storage?: Input<SizeGbTb>;
  /**
   * Enable [RDS Proxy](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-proxy.html) for the database.
   * @default `false`
   * @example
   * ```js
   * {
   *   proxy: true
   * }
   * ```
   */
  proxy?: Input<true>;
  /**
   * @internal
   */
  replicas?: Input<number>;
  /**
   * The VPC subnets to use for the database.
   *
   * @example
   * ```js
   * {
   *   vpc: {
   *     subnets: ["subnet-0db7376a7ad4db5fd ", "subnet-06fc7ee8319b2c0ce"],
   *   }
   * }
   * ```
   *
   * Or create a `Vpc` component.
   *
   * ```js
   * const myVpc = new sst.aws.Vpc("MyVpc");
   * ```
   *
   * And pass it in. The database will be placed in the private subnets.
   *
   * ```js
   * {
   *   vpc: myVpc
   * }
   * ```
   */
  vpc:
    | Vpc
    | Input<{
        /**
         * A list of subnet IDs in the VPC.
         */
        subnets: Input<Input<string>[]>;
      }>;
  /**
   * [Transform](/docs/components#transform) how this component creates its underlying
   * resources.
   */
  transform?: {
    /**
     * Transform the RDS subnet group.
     */
    subnetGroup?: Transform<rds.SubnetGroupArgs>;
    /**
     * Transform the RDS parameter group.
     */
    parameterGroup?: Transform<rds.ParameterGroupArgs>;
    /**
     * Transform the database instance in the RDS Cluster.
     */
    instance?: Transform<rds.InstanceArgs>;
  };
}

export interface PostgresGetArgs {
  /**
   * The ID of the database.
   */
  id: Input<string>;
  /**
   * The ID of the proxy.
   */
  proxyId?: Input<string>;
}

interface PostgresRef {
  ref: boolean;
  instance: rds.Instance;
  password: Output<string>;
  proxy: Output<rds.Proxy | undefined>;
}

/**
 * The `Postgres` component lets you add a Postgres database to your app using
 * [Amazon RDS Postgres](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_PostgreSQL.html).
 *
 * @example
 *
 * #### Create the database
 *
 * ```js title="sst.config.ts"
 * const vpc = new sst.aws.Vpc("MyVpc");
 * const database = new sst.aws.Postgres("MyDatabase", { vpc });
 * ```
 *
 * #### Link to a resource
 *
 * You can link your database to other resources, like a function or your Next.js app.
 *
 * ```ts title="sst.config.ts"
 * new sst.aws.Nextjs("MyWeb", {
 *   link: [database],
 *   vpc
 * });
 * ```
 *
 * Once linked, you can connect to it from your function code.
 *
 * ```ts title="app/page.tsx" {1,5-9}
 * import { Resource } from "sst";
 * import { Pool } from "pg";
 *
 * const client = new Pool({
 *   user: Resource.MyDatabase.username,
 *   password: Resource.MyDatabase.password,
 *   database: Resource.MyDatabase.database,
 *   host: Resource.MyDatabase.host,
 *   port: Resource.MyDatabase.port,
 * });
 * await client.connect();
 * ```
 */
export class Postgres extends Component implements Link.Linkable {
  private instance: rds.Instance;
  private _password: Output<string>;
  private proxy: Output<rds.Proxy | undefined>;
  public static v1 = PostgresV1;

  constructor(
    name: string,
    args: PostgresArgs,
    opts?: ComponentResourceOptions,
  ) {
    const _version = 2;
    super(__pulumiType, name, args, opts, {
      _version,
      _message: [
        `This component has been renamed. Please change:`,
        ``,
        `"sst.aws.Postgres" to "sst.aws.Postgres.v${$cli.state.version[name]}"`,
        ``,
        `Learn more https://sst.dev/docs/components/#versioning`,
      ].join("\n"),
    });

    if (args && "ref" in args) {
      const ref = args as unknown as PostgresRef;
      this.instance = ref.instance;
      this._password = ref.password;
      this.proxy = output(ref.proxy);
      return;
    }

    const parent = this;

    const engineVersion = output(args.version).apply((v) => v ?? "16.4");
    const instanceType = output(args.instance).apply((v) => v ?? "t4g.micro");
    const storage = normalizeStorage();
    const dbName = output(args.database).apply(
      (v) => v ?? $app.name.replaceAll("-", "_"),
    );
    const vpc = normalizeVpc();
    const username = output(args.username).apply((v) => v ?? "postgres");
    const { password, secret } = createPassword();
    const subnetGroup = createSubnetGroup();
    const parameterGroup = createParameterGroup();
    const instance = createInstance();
    createReplicas();
    const proxy = createProxy();

    this.instance = instance;
    this._password = password;
    this.proxy = proxy;

    function normalizeStorage() {
      return output(args.storage ?? "20 GB").apply((v) => {
        const size = toGBs(v);
        if (size < 20)
          throw new VisibleError(
            `Storage must be at least 20 GB for the ${name} Postgres database.`,
          );
        if (size > 65536)
          throw new VisibleError(
            `Storage cannot be greater than 65536 GB (64 TB) for the ${name} Postgres database.`,
          );
        return size;
      });
    }

    function normalizeVpc() {
      // "vpc" is a Vpc.v1 component
      if (args.vpc instanceof VpcV1) {
        throw new VisibleError(
          `You are using the "Vpc.v1" component. Please migrate to the latest "Vpc" component.`,
        );
      }

      // "vpc" is a Vpc component
      if (args.vpc instanceof Vpc) {
        return {
          subnets: args.vpc.privateSubnets,
        };
      }

      // "vpc" is object
      return output(args.vpc);
    }

    function createSubnetGroup() {
      return new rds.SubnetGroup(
        ...transform(
          args.transform?.subnetGroup,
          `${name}SubnetGroup`,
          {
            subnetIds: vpc.subnets,
          },
          { parent },
        ),
      );
    }

    function createParameterGroup() {
      return new rds.ParameterGroup(
        ...transform(
          args.transform?.parameterGroup,
          `${name}ParameterGroup`,
          {
            family: "postgres16",
            parameters: [
              {
                name: "rds.force_ssl",
                value: "0",
              },
              {
                name: "rds.logical_replication",
                value: "1",
                applyMethod: "pending-reboot",
              },
            ],
          },
          { parent },
        ),
      );
    }

    function createPassword() {
      const password = args.password
        ? output(args.password)
        : new RandomPassword(
            `${name}Password`,
            {
              length: 32,
              special: false,
            },
            { parent },
          ).result;

      const secret = new secretsmanager.Secret(
        `${name}ProxySecret`,
        {
          recoveryWindowInDays: 0,
        },
        { parent },
      );

      new secretsmanager.SecretVersion(
        `${name}ProxySecretVersion`,
        {
          secretId: secret.id,
          secretString: jsonStringify({
            username,
            password,
          }),
        },
        { parent },
      );

      return { secret, password };
    }

    function createInstance() {
      return new rds.Instance(
        ...transform(
          args.transform?.instance,
          `${name}Instance`,
          {
            dbName,
            dbSubnetGroupName: subnetGroup.name,
            engine: "postgres",
            engineVersion,
            instanceClass: interpolate`db.${instanceType}`,
            username,
            password,
            parameterGroupName: parameterGroup.name,
            skipFinalSnapshot: true,
            storageEncrypted: true,
            storageType: "gp3",
            allocatedStorage: 20,
            maxAllocatedStorage: storage,
            backupRetentionPeriod: 7,
            performanceInsightsEnabled: true,
            tags: {
              "sst:lookup:password": secret.id,
            },
          },
          { parent, deleteBeforeReplace: true },
        ),
      );
    }

    function createReplicas() {
      return output(args.replicas ?? 0).apply((replicas) =>
        Array.from({ length: replicas }).map(
          (_, i) =>
            new rds.Instance(
              `${name}Replica${i}`,
              {
                replicateSourceDb: instance.identifier,
                dbName: interpolate`${instance.dbName}_replica${i}`,
                dbSubnetGroupName: instance.dbSubnetGroupName,
                availabilityZone: instance.availabilityZone,
                engine: instance.engine,
                engineVersion: instance.engineVersion,
                instanceClass: instance.instanceClass,
                username: instance.username,
                password: instance.password.apply((v) => v!),
                parameterGroupName: instance.parameterGroupName,
                skipFinalSnapshot: true,
                storageEncrypted: instance.storageEncrypted.apply((v) => v!),
                storageType: instance.storageType,
                allocatedStorage: instance.allocatedStorage,
                maxAllocatedStorage: instance.maxAllocatedStorage.apply(
                  (v) => v!,
                ),
              },
              { parent },
            ),
        ),
      );
    }

    function createProxy() {
      return output(args.proxy).apply((proxy) => {
        if (!proxy) return;

        const role = new iam.Role(
          `${name}ProxyRole`,
          {
            assumeRolePolicy: iam.assumeRolePolicyForPrincipal({
              Service: "rds.amazonaws.com",
            }),
            inlinePolicies: [
              {
                name: "inline",
                policy: iam.getPolicyDocumentOutput({
                  statements: [
                    {
                      actions: ["secretsmanager:GetSecretValue"],
                      resources: [secret.arn],
                    },
                  ],
                }).json,
              },
            ],
          },
          { parent },
        );

        const rdsProxy = new rds.Proxy(
          `${name}Proxy`,
          {
            engineFamily: "POSTGRESQL",
            auths: [
              {
                authScheme: "SECRETS",
                iamAuth: "DISABLED",
                secretArn: secret.arn,
              },
            ],
            roleArn: role.arn,
            vpcSubnetIds: vpc.subnets,
          },
          { parent },
        );

        const targetGroup = new rds.ProxyDefaultTargetGroup(
          `${name}ProxyTargetGroup`,
          {
            dbProxyName: rdsProxy.name,
          },
          { parent },
        );

        new rds.ProxyTarget(
          `${name}ProxyTarget`,
          {
            dbProxyName: rdsProxy.name,
            targetGroupName: targetGroup.name,
            dbInstanceIdentifier: instance.identifier,
          },
          { parent },
        );

        return rdsProxy;
      });
    }
  }

  /**
   * The identifier of the Postgres instance.
   */
  public get id() {
    return this.instance.identifier;
  }

  /**
   * The name of the Postgres proxy.
   */
  public get proxyId() {
    return this.proxy.apply((v) => {
      if (!v)
        throw new VisibleError(
          `Proxy is not enabled. Enable it with "proxy: true".`,
        );
      return v.id;
    });
  }

  /** The username of the master user. */
  public get username() {
    return this.instance.username;
  }

  /** The password of the master user. */
  public get password() {
    return this._password;
  }

  /**
   * The name of the database.
   */
  public get database() {
    return this.instance.dbName;
  }

  /**
   * The port of the database.
   */
  public get port() {
    return this.instance.port;
  }

  /**
   * The host of the database.
   */
  public get host() {
    return all([this.instance.endpoint, this.proxy]).apply(
      ([endpoint, proxy]) => proxy?.endpoint ?? output(endpoint.split(":")[0]),
    );
  }

  public get nodes() {
    return {
      instance: this.instance,
    };
  }

  /** @internal */
  public getSSTLink() {
    return {
      properties: {
        database: this.database,
        username: this.username,
        password: this.password,
        port: this.port,
        host: this.host,
      },
    };
  }

  /**
   * Reference an existing Postgres database with the given name. This is useful when you
   * create a Postgres database in one stage and want to share it in another. It avoids
   * having to create a new Postgres database in the other stage.
   *
   * :::tip
   * You can use the `static get` method to share Postgres databases across stages.
   * :::
   *
   * @param name The name of the component.
   * @param args The arguments to get the Postgres database.
   * @param opts The component resource options.
   *
   * @example
   * Imagine you create a database in the `dev` stage. And in your personal stage `frank`,
   * instead of creating a new database, you want to share the same database from `dev`.
   *
   * ```ts title="sst.config.ts"
   * const database = $app.stage === "frank"
   *   ? sst.aws.Postgres.get("MyDatabase", {
   *       id: "app-dev-mydatabase",
   *       proxyId: "app-dev-mydatabase-proxy",
   *     })
   *   : new sst.aws.Postgres("MyDatabase", {
   *       proxy: true,
   *     });
   * ```
   *
   * You can also do this with a provider.
   * ```ts title="sst.config.ts"
   * const providerEUWest = new aws.Provider('aws-eu-west-3', {
   *   region: 'eu-west-3',
   * });
   *
   * const database =
   *   $app.stage === "frank"
   *     ? sst.aws.Postgres.get(
   *         "MyDatabase",
   *         {
   *           id: "app-dev-mydatabase",
   *         },
   *         {
   *           provider: providerEUWest,
   *         },
   *       )
   *     : new sst.aws.Postgres("MyDatabase", undefined, {
   *         provider: providerEUWest,
   *       });
   * ```
   *
   * Here `app-dev-mydatabase` is the ID of the database, and `app-dev-mydatabase-proxy`
   * is the ID of the proxy created in the `dev` stage. You can find these by outputting
   * the database ID and proxy ID in the `dev` stage.
   *
   * ```ts title="sst.config.ts"
   * return {
   *   id: database.id,
   *   proxyId: database.proxyId,
   * };
   * ```
   */
  public static get(
    name: string,
    args: PostgresGetArgs,
    opts?: ComponentResourceOptions,
  ) {
    const instance = rds.Instance.get(
      `${name}Instance`,
      args.id,
      undefined,
      opts,
    );
    const proxy = args.proxyId
      ? rds.Proxy.get(`${name}Proxy`, args.proxyId, undefined, opts)
      : undefined;

    // get secret
    const secret = instance.tags.apply((tags) =>
      tags?.["sst:lookup:password"]
        ? secretsmanager.getSecretVersionOutput(
            {
              secretId: tags["sst:lookup:password"],
            },
            opts,
          )
        : output(undefined),
    );
    const password = secret.apply((v) => {
      if (!v)
        throw new VisibleError(`Failed to get password for Postgres ${name}.`);
      return JSON.parse(v.secretString).password as string;
    });

    return new Postgres(name, {
      ref: true,
      instance,
      password,
      proxy,
    } as unknown as PostgresArgs);
  }
}

const __pulumiType = "sst:aws:Postgres";
// @ts-expect-error
Postgres.__pulumiType = __pulumiType;
