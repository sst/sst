import { ComponentResourceOptions, Output, all } from "@pulumi/pulumi";
import { Component, Transform, transform } from "../component";
import { Input } from "../input";
import { ec2, getAvailabilityZonesOutput } from "@pulumi/aws";

export interface VpcArgs {
  /**
   * Number of Availability Zones or AZs for the VPC. By default, it creates a VPC with 2
   * AZs since services like RDS and Fargate need at least 2 AZs.
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
   * [Transform](/docs/components#transform) how this component creates its underlying
   * resources.
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
  };
}

/**
 * The `Vpc` component lets you add a VPC to your app. It uses [Amazon VPC](https://docs.aws.amazon.com/vpc/). This is useful for services like RDS and Fargate that need to be hosted inside
 * a VPC.
 *
 * This creates a VPC with 2 Availability Zones by default. It also creates the following
 * resources:
 *
 * 1. A security group.
 * 2. A public subnet in each AZ.
 * 3. A private subnet in each AZ.
 * 4. An Internet Gateway, all the traffic from the public subnets are routed through it.
 * 5. A NAT Gateway in each AZ. All the traffic from the private subnets are routed to the
 *    NAT Gateway in the same AZ.
 *
 * :::note
 * By default, this creates two NAT Gateways, one in each AZ. And it roughly costs $33 per
 * NAT Gateway per month.
 * :::
 *
 * NAT Gateways are billed per hour and per gigabyte of data processed. By default,
 * this creates a NAT Gateway in each AZ. And this would be roughly $33 per NAT
 * Gateway per month. Make sure to [review the pricing](https://aws.amazon.com/vpc/pricing/).
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
 * ```ts title="sst.config.ts"
 * new sst.aws.Vpc("MyVPC", {
 *   az: 3,
 * });
 * ```
 */
export class Vpc extends Component {
  private vpc: ec2.Vpc;
  private internetGateway: ec2.InternetGateway;
  private securityGroup: ec2.SecurityGroup;
  private natGateways: Output<ec2.NatGateway[]>;
  private elasticIps: Output<ec2.Eip[]>;
  private _publicSubnets: Output<ec2.Subnet[]>;
  private _privateSubnets: Output<ec2.Subnet[]>;
  private publicRouteTables: Output<ec2.RouteTable[]>;
  private privateRouteTables: Output<ec2.RouteTable[]>;

  constructor(name: string, args?: VpcArgs, opts?: ComponentResourceOptions) {
    super(__pulumiType, name, args, opts);

    const parent = this;

    const zones = normalizeAz();

    const vpc = createVpc();
    const internetGateway = createInternetGateway();
    const securityGroup = createSecurityGroup();
    const { publicSubnets, publicRouteTables } = createPublicSubnets();
    const { elasticIps, natGateways } = createNatGateways();
    const { privateSubnets, privateRouteTables } = createPrivateSubnets();

    this.vpc = vpc;
    this.internetGateway = internetGateway;
    this.securityGroup = securityGroup;
    this.natGateways = natGateways;
    this.elasticIps = elasticIps;
    this._publicSubnets = publicSubnets;
    this._privateSubnets = privateSubnets;
    this.publicRouteTables = publicRouteTables;
    this.privateRouteTables = privateRouteTables;

    function normalizeAz() {
      const zones = getAvailabilityZonesOutput({
        state: "available",
      });
      return all([zones, args?.az ?? 2]).apply(([zones, az]) =>
        Array(az)
          .fill(0)
          .map((_, i) => zones.names[i]),
      );
    }

    function createVpc() {
      return new ec2.Vpc(
        `${name}Vpc`,
        transform(args?.transform?.vpc, {
          cidrBlock: "10.0.0.0/16",
          enableDnsSupport: true,
          enableDnsHostnames: true,
        }),
        { parent },
      );
    }

    function createInternetGateway() {
      return new ec2.InternetGateway(
        `${name}InternetGateway`,
        transform(args?.transform?.internetGateway, {
          vpcId: vpc.id,
        }),
        { parent },
      );
    }

    function createSecurityGroup() {
      return new ec2.SecurityGroup(
        `${name}SecurityGroup`,
        transform(args?.transform?.securityGroup, {
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
              cidrBlocks: ["0.0.0.0/0"],
            },
          ],
        }),
        { parent },
      );
    }

    function createNatGateways() {
      const ret = publicSubnets.apply((subnets) =>
        subnets.map((subnet, i) => {
          const elasticIp = new ec2.Eip(
            `${name}ElasticIp${i + 1}`,
            transform(args?.transform?.elasticIp, {
              vpc: true,
            }),
            { parent },
          );

          const natGateway = new ec2.NatGateway(
            `${name}NatGateway${i + 1}`,
            transform(args?.transform?.natGateway, {
              subnetId: subnet.id,
              allocationId: elasticIp.id,
            }),
            { parent },
          );
          return { elasticIp, natGateway };
        }),
      );

      return {
        elasticIps: ret.apply((ret) => ret.map((r) => r.elasticIp)),
        natGateways: ret.apply((ret) => ret.map((r) => r.natGateway)),
      };
    }

    function createPublicSubnets() {
      const ret = zones.apply((zones) =>
        zones.map((zone, i) => {
          const subnet = new ec2.Subnet(
            `${name}PublicSubnet${i + 1}`,
            transform(args?.transform?.publicSubnet, {
              vpcId: vpc.id,
              cidrBlock: `10.0.${i + 1}.0/24`,
              availabilityZone: zone,
              mapPublicIpOnLaunch: true,
            }),
            { parent },
          );

          const routeTable = new ec2.RouteTable(
            `${name}PublicRouteTable${i + 1}`,
            transform(args?.transform?.publicRouteTable, {
              vpcId: vpc.id,
              routes: [
                {
                  cidrBlock: "0.0.0.0/0",
                  gatewayId: internetGateway.id,
                },
              ],
            }),
            { parent },
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
            `${name}PrivateSubnet${i + 1}`,
            transform(args?.transform?.privateSubnet, {
              vpcId: vpc.id,
              cidrBlock: `10.0.${zones.length + i + 1}.0/24`,
              availabilityZone: zone,
            }),
            { parent },
          );

          const routeTable = new ec2.RouteTable(
            `${name}PrivateRouteTable${i + 1}`,
            transform(args?.transform?.privateRouteTable, {
              vpcId: vpc.id,
              routes: [
                {
                  cidrBlock: "0.0.0.0/0",
                  natGatewayId: natGateways[i].id,
                },
              ],
            }),
            { parent },
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
    };
  }

  /** @internal */
  public static get(
    name: string,
    args: ec2.GetVpcArgs,
    opts?: ComponentResourceOptions,
  ) {
    return new VpcRef(name, args, opts);
  }
}

class VpcRef extends Component {
  private _vpc: Output<ec2.GetVpcResult>;
  private _publicSubnets: Output<ec2.GetSubnetsResult>;
  private _privateSubnets: Output<ec2.GetSubnetsResult>;
  private _securityGroups: Output<ec2.GetSecurityGroupsResult>;

  constructor(
    name: string,
    args: ec2.GetVpcArgs,
    opts?: ComponentResourceOptions,
  ) {
    super(__pulumiType + "Ref", name, args, opts);

    this._vpc = ec2.getVpcOutput(args);
    this._publicSubnets = ec2.getSubnetsOutput({
      filters: [
        { name: "vpc-id", values: [this._vpc.id] },
        { name: "tag:Name", values: ["*Public*"] },
      ],
    });
    this._privateSubnets = ec2.getSubnetsOutput({
      filters: [
        { name: "vpc-id", values: [this._vpc.id] },
        { name: "tag:Name", values: ["*Private*"] },
      ],
    });
    this._securityGroups = ec2.getSecurityGroupsOutput({
      filters: [{ name: "vpc-id", values: [this._vpc.id] }],
    });
  }

  /**
   * The VPC ID.
   */
  public get id() {
    return this._vpc.id;
  }

  /**
   * A list of public subnet IDs in the VPC.
   */
  public get publicSubnets() {
    return this._publicSubnets.ids;
  }

  /**
   * A list of private subnet IDs in the VPC.
   */
  public get privateSubnets() {
    return this._privateSubnets.ids;
  }

  /**
   * A list of VPC security group IDs.
   */
  public get securityGroups() {
    return this._securityGroups.ids;
  }
}

const __pulumiType = "sst:aws:Vpc";
// @ts-expect-error
Vpc.__pulumiType = __pulumiType;
