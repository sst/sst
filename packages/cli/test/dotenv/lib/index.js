import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as sst from "@serverless-stack/resources";

class DynamoDBStack extends sst.Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    console.log(`[ENV=${process.env.ENV}]`);
    console.log(`[ENV_LOCAL=${process.env.ENV_LOCAL}]`);
    console.log(`[ENV_PROD=${process.env.ENV_PROD}]`);
    console.log(`[ENV_PROD_LOCAL=${process.env.ENV_PROD_LOCAL}]`);
    console.log(`[ENV_DEV=${process.env.ENV_DEV}]`);
    console.log(`[ENV_DEV_LOCAL=${process.env.ENV_DEV_LOCAL}]`);

    console.log(`[PATH=${process.env.PATH}]`);
    console.log(`[TEST_REPLACE=${process.env.TEST_REPLACE}]`);
    console.log(`[TEST_ESCAPE=${process.env.TEST_ESCAPE}]`);

    console.log(
      `[TEST_ENVLOCAL_OVERIDE_ENV=${process.env.TEST_ENVLOCAL_OVERIDE_ENV}]`
    );
    console.log(
      `[TEST_ENVPROD_OVERIDE_ENV=${process.env.TEST_ENVPROD_OVERIDE_ENV}]`
    );
    console.log(
      `[TEST_ENVPRODLOCAL_OVERIDE_ENV=${process.env.TEST_ENVPRODLOCAL_OVERIDE_ENV}]`
    );

    console.log(
      `[TEST_ENVPROD_OVERIDE_ENVLOCAL=${process.env.TEST_ENVPROD_OVERIDE_ENVLOCAL}]`
    );
    console.log(
      `[TEST_ENVPRODLOCAL_OVERIDE_ENVLOCAL=${process.env.TEST_ENVPRODLOCAL_OVERIDE_ENVLOCAL}]`
    );

    console.log(
      `[TEST_ENVPRODLOCAL_OVERIDE_ENVPROD=${process.env.TEST_ENVPRODLOCAL_OVERIDE_ENVPROD}]`
    );

    new dynamodb.Table(this, "notes", {
      partitionKey: { name: "userId", type: dynamodb.AttributeType.STRING },
    });
  }
}

export default function main(app) {
  new DynamoDBStack(app, "dynamodb");
}
