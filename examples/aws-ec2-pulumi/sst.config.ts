/// <reference path="./.sst/platform/config.d.ts" />

/**
 * ## EC2 with Pulumi
 *
 * Use raw Pulumi resources to create an EC2 instance.
 */
export default $config({
	app(input) {
		return {
			name: "aws-ec2-pulumi",
			home: "aws",
			removal: input?.stage === "production" ? "retain" : "remove",
		};
	},
	async run() {
		// Notice you don't need to import pulumi, it is already part of sst.
		const securityGroup = new aws.ec2.SecurityGroup("web-secgrp", {
			ingress: [
				{
					protocol: "tcp",
					fromPort: 80,
					toPort: 80,
					cidrBlocks: ["0.0.0.0/0"],
				},
			],
		});

		// Find the latest Ubuntu AMI
		const ami = aws.ec2.getAmi({
			filters: [
				{
					name: "name",
					values: ["ubuntu/images/hvm-ssd/ubuntu-focal-20.04-amd64-server-*"],
				},
			],
			mostRecent: true,
			owners: ["099720109477"], // Canonical
		});

		// User data to set up a simple web server
		const userData = `#!/bin/bash
  echo "Hello, World!" > index.html
  nohup python3 -m http.server 80 &`;

		// Create an EC2 instance
		const server = new aws.ec2.Instance("web-server", {
			instanceType: "t2.micro",
			ami: ami.then((ami) => ami.id),
			userData: userData,
			vpcSecurityGroupIds: [securityGroup.id],
			associatePublicIpAddress: true,
		});

		return {
			app: server.publicIp,
		};
	},
});
