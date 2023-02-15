import {
  APIGatewayClient,
  GetAccountCommand,
  UpdateAccountCommand,
} from "@aws-sdk/client-api-gateway";
import {
  IAMClient,
  AttachRolePolicyCommand,
  CreateRoleCommand,
} from "@aws-sdk/client-iam";

const apig = new APIGatewayClient({ logger: console });
const iam = new IAMClient({ logger: console });

export async function ApiGatewayCloudWatchRole(cfnRequest: any) {
  switch (cfnRequest.RequestType) {
    case "Create":
    case "Update":
      const { roleArn, roleName } = cfnRequest.ResourceProperties;

      if (await hasRole()) {
        return;
      }
      await createRole(roleName);
      await attachRoleToApiGateway(roleArn);
      break;
    case "Delete":
      break;
    default:
      throw new Error("Unsupported request type");
  }
}

async function hasRole() {
  console.log("hasRole");

  const result = await apig.send(new GetAccountCommand({}));

  return result.cloudwatchRoleArn;
}

async function createRole(roleName: string) {
  console.log("createRole");

  try {
    const result = await iam.send(
      new CreateRoleCommand({
        RoleName: roleName,
        AssumeRolePolicyDocument: JSON.stringify({
          Version: "2012-10-17",
          Statement: [
            {
              Effect: "Allow",
              Principal: {
                Service: "apigateway.amazonaws.com",
              },
              Action: "sts:AssumeRole",
            },
          ],
        }),
        Description: "Role for API Gateway to push logs to CloudWatch",
      })
    );

    if (!result.Role) {
      throw new Error("Failed to create role");
    }
  } catch (e: any) {
    if (
      e.name === "EntityAlreadyExistsException" &&
      e.message === `Role with name ${roleName} already exists.`
    ) {
      console.log("Role already exists");
    } else {
      throw e;
    }
  }

  await iam.send(
    new AttachRolePolicyCommand({
      RoleName: roleName,
      PolicyArn:
        "arn:aws:iam::aws:policy/service-role/AmazonAPIGatewayPushToCloudWatchLogs",
    })
  );
}

async function attachRoleToApiGateway(roleArn: string) {
  console.log("attachRoleToApiGateway");

  await apig.send(
    new UpdateAccountCommand({
      patchOperations: [
        {
          op: "replace",
          path: "/cloudwatchRoleArn",
          value: roleArn,
        },
      ],
    })
  );
}
