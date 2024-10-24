import {
  ComponentResourceOptions,
  Output,
  all,
  interpolate,
  output,
} from "@pulumi/pulumi";
import { Component, Transform, transform } from "../component";
import { Input } from "../input";
import {
  ec2,
  getAvailabilityZonesOutput,
  iam,
  route53,
  servicediscovery,
  ssm,
} from "@pulumi/aws";
import { Vpc as VpcV1 } from "./vpc-v1";
import { Link } from "../link";
import { VisibleError } from "../error";
import { PrivateKey } from "@pulumi/tls";
export type { VpcArgs as VpcV1Args } from "./vpc-v1";

export interface VpcArgs {
  /**
   * Number of Availability Zones or AZs for the VPC. By default, it creates a VPC with 2
   * availability zones since services like RDS and Fargate need at least 2 AZs.
   * @default `2`
   * @example
   * ```ts
   * {
   *   az: 3
   * }
   * ```
   */
  az?: Input<number>;
  /**
   * Configures NAT. Enabling NAT allows resources in private subnets to connect to the internet.
   *
   * There are two NAT options:
   * 1. `"managed"` creates a [NAT Gateway](https://docs.aws.amazon.com/vpc/latest/userguide/vpc-nat-gateway.html)
   * 2. `"ec2"` creates an [EC2 instance](https://docs.aws.amazon.com/vpc/latest/userguide/vpc-nat-gateway.html)
   *    with the [fck-nat](https://github.com/AndrewGuenther/fck-nat) AMI
   *
   * For `"managed"`, a NAT Gateway is created in each AZ. All the traffic from
   * the private subnets are routed to the NAT Gateway in the same AZ.
   *
   * NAT Gateways are billed per hour and per gigabyte of data processed. Each NAT Gateway
   * roughly costs $33 per month. Make sure to [review the pricing](https://aws.amazon.com/vpc/pricing/).
   *
   * For `"ec2"`, an EC2 instance of type `t4g.nano` will be launched in each AZ
   * with the [fck-nat](https://github.com/AndrewGuenther/fck-nat) AMI. All the traffic from
   * the private subnets are routed to the Elastic Network Interface (ENI) of the EC2 instance
   * in the same AZ.
   *
   * :::tip
   * The `"ec2"` option uses fck-nat and is 10x cheaper than the `"managed"` NAT Gateway.
   * :::
   *
   * NAT EC2 instances are much cheaper than NAT Gateways, the `t4g.nano` instance type is around
   * $3 per month. But you'll need to scale it up manually if you need more bandwidth.
   *
   * @default NAT is disabled
   * @example
   * ```ts
   * {
   *   nat: "managed"
   * }
   * ```
   */
  nat?: Input<
    | "ec2"
    | "managed"
    | {
        /**
         * Configures the NAT EC2 instance.
         * @default `{instance: "t4g.nano"}`
         * @example
         * ```ts
         * {
         *   nat: {
         *     ec2: {
         *       instance: "t4g.large"
         *     }
         *   }
         * }
         * ```
         */
        ec2: Input<{
          /**
           * The type of instance to use for the NAT.
           *
           * @default `"t4g.nano"`
           */
          instance: Input<string>;
        }>;
      }
  >;
  /**
   * Configures a bastion host that can be used to connect to resources in the VPC.
   *
   * When enabled, an EC2 instance of type `t4g.nano` with the bastion AMI will be launched
   * in a public subnet. The instance will have AWS SSM (AWS Session Manager) enabled for
   * secure access without the need for SSH key.
   *
   * It costs roughly $3 per month to run the `t4g.nano` instance.
   *
   * :::note
   * If `nat: "ec2"` is enabled, the bastion host will reuse the NAT EC2 instance.
   * :::
   *
   * However if `nat: "ec2"` is enabled, the EC2 instance that NAT creates will be used
   * as the bastion host. No additional EC2 instance will be created.
   *
   * If you are running `sst dev`, a tunnel will be automatically created to the bastion host.
   * This uses a network interface to forward traffic from your local machine to the bastion host.
   *
   * You can learn more about [`sst tunnel`](/docs/reference/cli#tunnel).
   *
   * @default Bastion is not created
   * @example
   * ```ts
   * {
   *   bastion: true
   * }
   * ```
   */
  bastion?: Input<true>;
  /**
   * [Transform](/docs/components#transform) how this component creates its
   * underlying resources.
   */
  transform?: {
    /**
     * Transform the EC2 VPC resource.
     */
    vpc?: Transform<ec2.VpcArgs>;
    /**
     * Transform the EC2 Internet Gateway resource.
     */
    internetGateway?: Transform<ec2.InternetGatewayArgs>;
    /**
     * Transform the EC2 NAT Gateway resource.
     */
    natGateway?: Transform<ec2.NatGatewayArgs>;
    /**
     * Transform the EC2 NAT instance resource.
     */
    natInstance?: Transform<ec2.InstanceArgs>;
    /**
     * Transform the EC2 Elastic IP resource.
     */
    elasticIp?: Transform<ec2.EipArgs>;
    /**
     * Transform the EC2 Security Group resource.
     */
    securityGroup?: Transform<ec2.SecurityGroupArgs>;
    /**
     * Transform the EC2 public subnet resource.
     */
    publicSubnet?: Transform<ec2.SubnetArgs>;
    /**
     * Transform the EC2 private subnet resource.
     */
    privateSubnet?: Transform<ec2.SubnetArgs>;
    /**
     * Transform the EC2 route table resource for the public subnet.
     */
    publicRouteTable?: Transform<ec2.RouteTableArgs>;
    /**
     * Transform the EC2 route table resource for the private subnet.
     */
    privateRouteTable?: Transform<ec2.RouteTableArgs>;
    /**
     * Transform the EC2 bastion instance resource.
     */
    bastionInstance?: Transform<ec2.InstanceArgs>;
  };
}

interface VpcRef {
  ref: boolean;
  vpc: ec2.Vpc;
  internetGateway: ec2.InternetGateway;
  securityGroup: ec2.SecurityGroup;
  privateSubnets: Output<ec2.Subnet[]>;
  privateRouteTables: Output<ec2.RouteTable[]>;
  publicSubnets: Output<ec2.Subnet[]>;
  publicRouteTables: Output<ec2.RouteTable[]>;
  natGateways: Output<ec2.NatGateway[]>;
  natInstances: Output<ec2.Instance[]>;
  elasticIps: Output<ec2.Eip[]>;
  bastionInstance: Output<ec2.Instance | undefined>;
  cloudmapNamespace: servicediscovery.PrivateDnsNamespace;
  privateKeyValue: Output<string | undefined>;
}

/**
 * The `Vpc` component lets you add a VPC to your app. It uses [Amazon VPC](https://docs.aws.amazon.com/vpc/). This is useful for services like RDS and Fargate that need to be hosted inside
 * a VPC.
 *
 * This creates a VPC with 2 Availability Zones by default. It also creates the following
 * resources:
 *
 * 1. A default security group blocking all incoming internet traffic.
 * 2. A public subnet in each AZ.
 * 3. A private subnet in each AZ.
 * 4. An Internet Gateway. All the traffic from the public subnets are routed through it.
 * 5. If `nat` is enabled, a NAT Gateway or NAT instance in each AZ. All the traffic from
 *    the private subnets are routed to the NAT in the same AZ.
 *
 * :::note
 * By default, this does not create NAT Gateways or NAT instances.
 * :::
 *
 * @example
 *
 * #### Create a VPC
 *
 * ```ts title="sst.config.ts"
 * new sst.aws.Vpc("MyVPC");
 * ```
 *
 * #### Create it with 3 Availability Zones
 *
 * ```ts title="sst.config.ts" {2}
 * new sst.aws.Vpc("MyVPC", {
 *   az: 3
 * });
 * ```
 *
 * #### Enable NAT
 *
 * ```ts title="sst.config.ts" {2}
 * new sst.aws.Vpc("MyVPC", {
 *   nat: "managed"
 * });
 * ```
 */
export class Vpc extends Component implements Link.Linkable {
  private vpc: ec2.Vpc;
  private internetGateway: ec2.InternetGateway;
  private securityGroup: ec2.SecurityGroup;
  private natGateways: Output<ec2.NatGateway[]>;
  private natInstances: Output<ec2.Instance[]>;
  private elasticIps: Output<ec2.Eip[]>;
  private _publicSubnets: Output<ec2.Subnet[]>;
  private _privateSubnets: Output<ec2.Subnet[]>;
  private publicRouteTables: Output<ec2.RouteTable[]>;
  private privateRouteTables: Output<ec2.RouteTable[]>;
  private bastionInstance: Output<ec2.Instance | undefined>;
  private cloudmapNamespace: servicediscovery.PrivateDnsNamespace;
  private privateKeyValue: Output<string | undefined>;
  public static v1 = VpcV1;

  constructor(name: string, args?: VpcArgs, opts?: ComponentResourceOptions) {
    const _version = 2;
    super(__pulumiType, name, args, opts, {
      _version,
      _message: [
        `There is a new version of "Vpc" that has breaking changes.`,
        ``,
        `To continue using the previous version, rename "Vpc" to "Vpc.v${$cli.state.version[name]}". Or recreate this component to update - https://sst.dev/docs/components/#versioning`,
      ].join("\n"),
    });

    const parent = this;

    if (args && "ref" in args) {
      const ref = args as VpcRef;
      this.vpc = ref.vpc;
      this.internetGateway = ref.internetGateway;
      this.securityGroup = ref.securityGroup;
      this._publicSubnets = output(ref.publicSubnets);
      this._privateSubnets = output(ref.privateSubnets);
      this.publicRouteTables = output(ref.publicRouteTables);
      this.privateRouteTables = output(ref.privateRouteTables);
      this.natGateways = output(ref.natGateways);
      this.natInstances = output(ref.natInstances);
      this.elasticIps = ref.elasticIps;
      this.bastionInstance = ref.bastionInstance;
      this.cloudmapNamespace = ref.cloudmapNamespace;
      this.privateKeyValue = ref.privateKeyValue;
      registerOutputs();
      return;
    }

    const zones = normalizeAz();
    const nat = normalizeNat();

    const vpc = createVpc();
    const { keyPair, privateKeyValue } = createKeyPair();
    const internetGateway = createInternetGateway();
    const securityGroup = createSecurityGroup();
    const { publicSubnets, publicRouteTables } = createPublicSubnets();
    const { elasticIps, natGateways } = createNatGateways();
    const natInstances = createNatInstances();
    const { privateSubnets, privateRouteTables } = createPrivateSubnets();
    const bastionInstance = createBastion();
    const cloudmapNamespace = createCloudmapNamespace();

    this.vpc = vpc;
    this.internetGateway = internetGateway;
    this.securityGroup = securityGroup;
    this.natGateways = natGateways;
    this.natInstances = natInstances;
    this.elasticIps = elasticIps;
    this._publicSubnets = publicSubnets;
    this._privateSubnets = privateSubnets;
    this.publicRouteTables = publicRouteTables;
    this.privateRouteTables = privateRouteTables;
    this.bastionInstance = output(bastionInstance);
    this.cloudmapNamespace = cloudmapNamespace;
    this.privateKeyValue = output(privateKeyValue);
    registerOutputs();

    function registerOutputs() {
      parent.registerOutputs({
        _tunnel: all([
          parent.bastionInstance,
          parent.privateKeyValue,
          parent._privateSubnets,
          parent._publicSubnets,
        ]).apply(
          ([bastion, privateKeyValue, privateSubnets, publicSubnets]) => {
            if (!bastion) return;
            return {
              ip: bastion.publicIp,
              username: "ec2-user",
              privateKey: privateKeyValue!,
              subnets: [...privateSubnets, ...publicSubnets].map(
                (s) => s.cidrBlock,
              ),
            };
          },
        ),
      });
    }

    function normalizeAz() {
      const zones = getAvailabilityZonesOutput(
        {
          state: "available",
        },
        { parent },
      );
      return all([zones, args?.az ?? 2]).apply(([zones, az]) =>
        Array(az)
          .fill(0)
          .map((_, i) => zones.names[i]),
      );
    }

    function normalizeNat() {
      return output(args?.nat).apply((nat) => {
        if (nat === "managed") return { type: "managed" as const };
        if (nat === "ec2")
          return { type: "ec2" as const, ec2: { instance: "t4g.nano" } };
        if (nat) return { type: "ec2" as const, ec2: nat.ec2 };
        return undefined;
      });
    }

    function createVpc() {
      return new ec2.Vpc(
        ...transform(
          args?.transform?.vpc,
          `${name}Vpc`,
          {
            cidrBlock: "10.0.0.0/16",
            enableDnsSupport: true,
            enableDnsHostnames: true,
          },
          { parent },
        ),
      );
    }

    function createKeyPair() {
      if (!args?.bastion) return {};

      const tlsPrivateKey = new PrivateKey(
        `${name}TlsPrivateKey`,
        {
          algorithm: "RSA",
          rsaBits: 4096,
        },
        { parent },
      );

      new ssm.Parameter(`${name}PrivateKey`, {
        name: interpolate`/sst/vpc/${vpc.id}/private-key`,
        type: ssm.ParameterType.SecureString,
        value: tlsPrivateKey.privateKeyOpenssh,
      });

      const keyPair = new ec2.KeyPair(
        `${name}KeyPair`,
        {
          publicKey: tlsPrivateKey.publicKeyOpenssh,
        },
        { parent },
      );

      return { keyPair, privateKeyValue: tlsPrivateKey.privateKeyOpenssh };
    }

    function createInternetGateway() {
      return new ec2.InternetGateway(
        ...transform(
          args?.transform?.internetGateway,
          `${name}InternetGateway`,
          {
            vpcId: vpc.id,
          },
          { parent },
        ),
      );
    }

    function createSecurityGroup() {
      return new ec2.DefaultSecurityGroup(
        ...transform(
          args?.transform?.securityGroup,
          `${name}SecurityGroup`,
          {
            vpcId: vpc.id,
            egress: [
              {
                fromPort: 0,
                toPort: 0,
                protocol: "-1",
                cidrBlocks: ["0.0.0.0/0"],
              },
            ],
            ingress: [
              {
                fromPort: 0,
                toPort: 0,
                protocol: "-1",
                // Restricts inbound traffic to only within the VPC
                cidrBlocks: [vpc.cidrBlock],
              },
            ],
          },
          { parent },
        ),
      );
    }

    function createNatGateways() {
      const ret = all([nat, publicSubnets]).apply(([nat, subnets]) => {
        if (nat?.type !== "managed") return [];

        return subnets.map((subnet, i) => {
          const elasticIp = new ec2.Eip(
            ...transform(
              args?.transform?.elasticIp,
              `${name}ElasticIp${i + 1}`,
              {
                vpc: true,
              },
              { parent },
            ),
          );

          const natGateway = new ec2.NatGateway(
            ...transform(
              args?.transform?.natGateway,
              `${name}NatGateway${i + 1}`,
              {
                subnetId: subnet.id,
                allocationId: elasticIp.id,
              },
              { parent },
            ),
          );
          return { elasticIp, natGateway };
        });
      });

      return {
        elasticIps: ret.apply((ret) => ret.map((r) => r.elasticIp)),
        natGateways: ret.apply((ret) => ret.map((r) => r.natGateway)),
      };
    }

    function createNatInstances() {
      return nat.apply((nat) => {
        if (nat?.type !== "ec2") return output([]);

        const sg = new ec2.SecurityGroup(
          `${name}NatInstanceSecurityGroup`,
          {
            vpcId: vpc.id,
            ingress: [
              {
                protocol: "-1",
                fromPort: 0,
                toPort: 0,
                cidrBlocks: ["0.0.0.0/0"],
              },
            ],
            egress: [
              {
                protocol: "-1",
                fromPort: 0,
                toPort: 0,
                cidrBlocks: ["0.0.0.0/0"],
              },
            ],
          },
          { parent },
        );

        const role = new iam.Role(
          `${name}NatInstanceRole`,
          {
            assumeRolePolicy: iam.getPolicyDocumentOutput({
              statements: [
                {
                  actions: ["sts:AssumeRole"],
                  principals: [
                    {
                      type: "Service",
                      identifiers: ["ec2.amazonaws.com"],
                    },
                  ],
                },
              ],
            }).json,
            managedPolicyArns: [
              "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore",
            ],
          },
          { parent },
        );

        const instanceProfile = new iam.InstanceProfile(
          `${name}NatInstanceProfile`,
          { role: role.name },
          { parent },
        );

        const ami = ec2.getAmiOutput(
          {
            owners: ["568608671756"], // AWS account ID for fck-nat AMI
            filters: [
              {
                name: "name",
                // The AMI has the SSM agent pre-installed
                values: ["fck-nat-al2023-*"],
              },
              {
                name: "architecture",
                values: ["arm64"],
              },
            ],
            mostRecent: true,
          },
          { parent },
        );

        return all([zones, publicSubnets]).apply(([zones, publicSubnets]) =>
          zones.map((_, i) => {
            return new ec2.Instance(
              `${name}NatInstance${i + 1}`,
              {
                instanceType: nat.ec2.instance,
                ami: ami.id,
                subnetId: publicSubnets[i].id,
                vpcSecurityGroupIds: [sg.id],
                iamInstanceProfile: instanceProfile.name,
                sourceDestCheck: false,
                keyName: keyPair?.keyName,
                tags: {
                  Name: `${name} NAT Instance`,
                  "sst:lookup-type": "nat",
                },
              },
              { parent },
            );
          }),
        );
      });
    }

    function createPublicSubnets() {
      const ret = zones.apply((zones) =>
        zones.map((zone, i) => {
          const subnet = new ec2.Subnet(
            ...transform(
              args?.transform?.publicSubnet,
              `${name}PublicSubnet${i + 1}`,
              {
                vpcId: vpc.id,
                cidrBlock: `10.0.${8 * i}.0/22`,
                availabilityZone: zone,
                mapPublicIpOnLaunch: true,
              },
              { parent },
            ),
          );

          const routeTable = new ec2.RouteTable(
            ...transform(
              args?.transform?.publicRouteTable,
              `${name}PublicRouteTable${i + 1}`,
              {
                vpcId: vpc.id,
                routes: [
                  {
                    cidrBlock: "0.0.0.0/0",
                    gatewayId: internetGateway.id,
                  },
                ],
              },
              { parent },
            ),
          );

          new ec2.RouteTableAssociation(
            `${name}PublicRouteTableAssociation${i + 1}`,
            {
              subnetId: subnet.id,
              routeTableId: routeTable.id,
            },
            { parent },
          );

          return { subnet, routeTable };
        }),
      );

      return {
        publicSubnets: ret.apply((ret) => ret.map((r) => r.subnet)),
        publicRouteTables: ret.apply((ret) => ret.map((r) => r.routeTable)),
      };
    }

    function createPrivateSubnets() {
      const ret = zones.apply((zones) =>
        zones.map((zone, i) => {
          const subnet = new ec2.Subnet(
            ...transform(
              args?.transform?.privateSubnet,
              `${name}PrivateSubnet${i + 1}`,
              {
                vpcId: vpc.id,
                cidrBlock: `10.0.${8 * i + 4}.0/22`,
                availabilityZone: zone,
              },
              { parent },
            ),
          );

          const routeTable = new ec2.RouteTable(
            ...transform(
              args?.transform?.privateRouteTable,
              `${name}PrivateRouteTable${i + 1}`,
              {
                vpcId: vpc.id,
                routes: all([natGateways, natInstances]).apply(
                  ([natGateways, natInstances]) => [
                    ...(natGateways[i]
                      ? [
                          {
                            cidrBlock: "0.0.0.0/0",
                            natGatewayId: natGateways[i].id,
                          },
                        ]
                      : []),
                    ...(natInstances[i]
                      ? [
                          {
                            cidrBlock: "0.0.0.0/0",
                            networkInterfaceId:
                              natInstances[i].primaryNetworkInterfaceId,
                          },
                        ]
                      : []),
                  ],
                ),
              },
              { parent },
            ),
          );

          new ec2.RouteTableAssociation(
            `${name}PrivateRouteTableAssociation${i + 1}`,
            {
              subnetId: subnet.id,
              routeTableId: routeTable.id,
            },
            { parent },
          );

          return { subnet, routeTable };
        }),
      );

      return {
        privateSubnets: ret.apply((ret) => ret.map((r) => r.subnet)),
        privateRouteTables: ret.apply((ret) => ret.map((r) => r.routeTable)),
      };
    }

    function createBastion() {
      if (!args?.bastion) return undefined;

      return natInstances.apply((natInstances) => {
        if (natInstances.length) return natInstances[0];

        const sg = new ec2.SecurityGroup(
          `${name}BastionSecurityGroup`,
          {
            vpcId: vpc.id,
            ingress: [
              {
                protocol: "tcp",
                fromPort: 22,
                toPort: 22,
                cidrBlocks: ["0.0.0.0/0"],
              },
            ],
            egress: [
              {
                protocol: "-1",
                fromPort: 0,
                toPort: 0,
                cidrBlocks: ["0.0.0.0/0"],
              },
            ],
          },
          { parent },
        );

        const role = new iam.Role(
          `${name}BastionRole`,
          {
            assumeRolePolicy: iam.getPolicyDocumentOutput({
              statements: [
                {
                  actions: ["sts:AssumeRole"],
                  principals: [
                    {
                      type: "Service",
                      identifiers: ["ec2.amazonaws.com"],
                    },
                  ],
                },
              ],
            }).json,
            managedPolicyArns: [
              "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore",
            ],
          },
          { parent },
        );
        const instanceProfile = new iam.InstanceProfile(
          `${name}BastionProfile`,
          { role: role.name },
          { parent },
        );
        const ami = ec2.getAmiOutput(
          {
            owners: ["amazon"],
            filters: [
              {
                name: "name",
                // The AMI has the SSM agent pre-installed
                values: ["al2023-ami-2023.5.*"],
              },
              {
                name: "architecture",
                values: ["arm64"],
              },
            ],
            mostRecent: true,
          },
          { parent },
        );
        return new ec2.Instance(
          ...transform(
            args?.transform?.bastionInstance,
            `${name}BastionInstance`,
            {
              instanceType: "t4g.nano",
              ami: ami.id,
              subnetId: publicSubnets.apply((v) => v[0].id),
              vpcSecurityGroupIds: [sg.id],
              iamInstanceProfile: instanceProfile.name,
              keyName: keyPair?.keyName,
              tags: {
                "sst:lookup-type": "bastion",
              },
            },
            { parent },
          ),
        );
      });
    }

    function createCloudmapNamespace() {
      return new servicediscovery.PrivateDnsNamespace(
        `${name}CloudmapNamespace`,
        {
          name: "sst",
          vpc: vpc.id,
        },
        { parent },
      );
    }
  }

  /**
   * The VPC ID.
   */
  public get id() {
    return this.vpc.id;
  }

  /**
   * A list of public subnet IDs in the VPC.
   */
  public get publicSubnets() {
    return this._publicSubnets.apply((subnets) =>
      subnets.map((subnet) => subnet.id),
    );
  }

  /**
   * A list of private subnet IDs in the VPC.
   */
  public get privateSubnets() {
    return this._privateSubnets.apply((subnets) =>
      subnets.map((subnet) => subnet.id),
    );
  }

  /**
   * A list of VPC security group IDs.
   */
  public get securityGroups() {
    return [this.securityGroup.id];
  }

  /**
   * The bastion instance ID.
   */
  public get bastion() {
    return this.bastionInstance.apply((v) => {
      if (!v)
        throw new VisibleError(
          `VPC bastion is not enabled. Enable it with "bastion: true".`,
        );
      return v.id;
    });
  }

  /**
   * The underlying [resources](/docs/components/#nodes) this component creates.
   */
  public get nodes() {
    return {
      /**
       * The Amazon EC2 VPC.
       */
      vpc: this.vpc,
      /**
       * The Amazon EC2 Internet Gateway.
       */
      internetGateway: this.internetGateway,
      /**
       * The Amazon EC2 Security Group.
       */
      securityGroup: this.securityGroup,
      /**
       * The Amazon EC2 NAT Gateway.
       */
      natGateways: this.natGateways,
      /**
       * The Amazon EC2 NAT instances.
       */
      natInstances: this.natInstances,
      /**
       * The Amazon EC2 Elastic IP.
       */
      elasticIps: this.elasticIps,
      /**
       * The Amazon EC2 public subnet.
       */
      publicSubnets: this._publicSubnets,
      /**
       * The Amazon EC2 private subnet.
       */
      privateSubnets: this._privateSubnets,
      /**
       * The Amazon EC2 route table for the public subnet.
       */
      publicRouteTables: this.publicRouteTables,
      /**
       * The Amazon EC2 route table for the private subnet.
       */
      privateRouteTables: this.privateRouteTables,
      /**
       * The Amazon EC2 bastion instance.
       */
      bastionInstance: this.bastionInstance,
      /**
       * The AWS Cloudmap namespace.
       */
      cloudmapNamespace: this.cloudmapNamespace,
    };
  }

  /**
   * Reference an existing VPC with the given ID. This is useful when you
   * create a VPC in one stage and want to share it in another stage. It avoids having to
   * create a new VPC in the other stage.
   *
   * :::tip
   * You can use the `static get` method to share VPCs across stages.
   * :::
   *
   * @param name The name of the component.
   * @param vpcId The ID of the existing VPC.
   * @param opts The component resource options.
   *
   * @example
   * Imagine you create a VPC in the `dev` stage. And in your personal stage `frank`,
   * instead of creating a new VPC, you want to share the VPC from `dev`.
   *
   * ```ts title="sst.config.ts"
   * const vpc = $app.stage === "frank"
   *   ? sst.aws.Vpc.get("MyVPC", "vpc-0be8fa4de860618bb")
   *   : new sst.aws.Vpc("MyVPC");
   * ```
   *
   * Here `vpc-0be8fa4de860618bb` is the ID of the VPC created in the `dev` stage.
   * You can find this by outputting the VPC ID in the `dev` stage.
   *
   * ```ts title="sst.config.ts"
   * return {
   *   vpc: vpc.id
   * };
   * ```
   *
   * You can also do this with a provider.
   * ```ts title="sst.config.ts"
   * const providerEUWest = new aws.Provider('aws-eu-west-3', {
   *   region: 'eu-west-3',
   * });
   *
   * const vpc = $app.stage === "frank"
   *   ? sst.aws.Vpc.get("MyVPC", "vpc-0be8fa4de860618bb", { provider: providerEUWest })
   *   : new sst.aws.Vpc("MyVPC", undefined, { provider: providerEUWest });
   * ```
   */
  public static get(
    name: string,
    vpcId: Input<string>,
    opts?: ComponentResourceOptions,
  ) {
    const vpc = ec2.Vpc.get(`${name}Vpc`, vpcId, undefined, opts);
    const internetGateway = ec2.InternetGateway.get(
      `${name}InstanceGateway`,
      ec2.getInternetGatewayOutput(
        {
          filters: [{ name: "attachment.vpc-id", values: [vpc.id] }],
        },
        opts,
      ).internetGatewayId,
      undefined,
      opts,
    );
    const securityGroup = ec2.SecurityGroup.get(
      `${name}SecurityGroup`,
      ec2
        .getSecurityGroupsOutput(
          {
            filters: [
              { name: "group-name", values: ["default"] },
              { name: "vpc-id", values: [vpc.id] },
            ],
          },
          opts,
        )
        .ids.apply((ids) => {
          if (!ids.length)
            throw new VisibleError(`Security group not found in VPC ${vpcId}`);
          return ids[0];
        }),
      undefined,
      opts,
    );
    const privateSubnets = ec2
      .getSubnetsOutput(
        {
          filters: [
            { name: "vpc-id", values: [vpc.id] },
            { name: "tag:Name", values: ["*Private*"] },
          ],
        },
        opts,
      )
      .ids.apply((ids) =>
        ids.map((id, i) =>
          ec2.Subnet.get(`${name}PrivateSubnet${i + 1}`, id, undefined, opts),
        ),
      );
    const privateRouteTables = privateSubnets.apply((subnets) =>
      subnets.map((subnet, i) =>
        ec2.RouteTable.get(
          `${name}PrivateRouteTable${i + 1}`,
          ec2.getRouteTableOutput({ subnetId: subnet.id }, opts).routeTableId,
          undefined,
          opts,
        ),
      ),
    );
    const publicSubnets = ec2
      .getSubnetsOutput(
        {
          filters: [
            { name: "vpc-id", values: [vpc.id] },
            { name: "tag:Name", values: ["*Public*"] },
          ],
        },
        opts,
      )
      .ids.apply((ids) =>
        ids.map((id, i) =>
          ec2.Subnet.get(`${name}PublicSubnet${i + 1}`, id, undefined, opts),
        ),
      );
    const publicRouteTables = publicSubnets.apply((subnets) =>
      subnets.map((subnet, i) =>
        ec2.RouteTable.get(
          `${name}PublicRouteTable${i + 1}`,
          ec2.getRouteTableOutput({ subnetId: subnet.id }, opts).routeTableId,
          undefined,
          opts,
        ),
      ),
    );
    const natGateways = publicSubnets.apply((subnets) => {
      const natGatewayIds = subnets.map((subnet, i) =>
        ec2
          .getNatGatewaysOutput(
            {
              filters: [
                { name: "subnet-id", values: [subnet.id] },
                { name: "state", values: ["available"] },
              ],
            },
            opts,
          )
          .ids.apply((ids) => ids[0]),
      );
      return output(natGatewayIds).apply((ids) =>
        ids
          .filter((id) => id)
          .map((id, i) =>
            ec2.NatGateway.get(
              `${name}NatGateway${i + 1}`,
              id,
              undefined,
              opts,
            ),
          ),
      );
    });
    const elasticIps = natGateways.apply((nats) =>
      nats.map((nat, i) =>
        ec2.Eip.get(
          `${name}ElasticIp${i + 1}`,
          nat.allocationId as Output<string>,
          undefined,
          opts,
        ),
      ),
    );
    const natInstances = ec2
      .getInstancesOutput(
        {
          filters: [
            { name: "tag:sst:lookup-type", values: ["nat"] },
            { name: "vpc-id", values: [vpc.id] },
          ],
        },
        opts,
      )
      .ids.apply((ids) =>
        ids.map((id, i) =>
          ec2.Instance.get(`${name}NatInstance${i + 1}`, id, undefined, opts),
        ),
      );
    const bastionInstance = ec2
      .getInstancesOutput(
        {
          filters: [
            { name: "tag:sst:lookup-type", values: ["bastion"] },
            { name: "vpc-id", values: [vpc.id] },
          ],
        },
        opts,
      )
      .ids.apply((ids) =>
        ids.length
          ? ec2.Instance.get(`${name}BastionInstance`, ids[0], undefined, opts)
          : undefined,
      );

    // Note: can also use servicediscovery.getDnsNamespaceOutput() here, ie.
    // ```ts
    // const namespaceId = servicediscovery.getDnsNamespaceOutput({
    //   name: "sst",
    //   type: "DNS_PRIVATE",
    // }).id;
    // ```
    // but if user deployed multiple VPCs into the same account. This will error because
    // there are multiple results. Even though `getDnsNamespaceOutput()` takes tags in args,
    // the tags are not used for lookup.
    const zone = output(vpcId).apply((vpcId) =>
      route53.getZone(
        {
          name: "sst",
          privateZone: true,
          vpcId,
        },
        opts,
      ),
    );
    const namespaceId = zone.linkedServiceDescription.apply((description) => {
      const match = description.match(/:namespace\/(ns-[a-z1-9]*)/)?.[1];
      if (!match)
        throw new VisibleError(
          `Cloud Map namespace not found for VPC ${vpcId}`,
        );
      return match;
    });
    const cloudmapNamespace = servicediscovery.PrivateDnsNamespace.get(
      `${name}CloudmapNamespace`,
      namespaceId,
      { vpc: vpcId },
      opts,
    );

    const privateKeyValue = bastionInstance.apply((v) => {
      if (!v) return;
      const param = ssm.Parameter.get(
        `${name}PrivateKey`,
        interpolate`/sst/vpc/${vpc.id}/private-key`,
        undefined,
        opts,
      );
      return param.value;
    });

    return new Vpc(name, {
      ref: true,
      vpc,
      internetGateway,
      securityGroup,
      privateSubnets,
      privateRouteTables,
      publicSubnets,
      publicRouteTables,
      natGateways,
      natInstances,
      elasticIps,
      bastionInstance,
      cloudmapNamespace,
      privateKeyValue: output(privateKeyValue),
    } satisfies VpcRef as VpcArgs);
  }

  /** @internal */
  public getSSTLink() {
    return {
      properties: {
        bastion: this.bastionInstance.apply((v) => v?.id),
      },
    };
  }
}

const __pulumiType = "sst:aws:Vpc";
// @ts-expect-error
Vpc.__pulumiType = __pulumiType;
