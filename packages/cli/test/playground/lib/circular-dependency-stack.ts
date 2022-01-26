import { Lazy } from "aws-cdk-lib";
import * as sst from "@serverless-stack/resources";

export class MainStack extends sst.Stack {
  constructor(scope: sst.App, id: string) {
    super(scope, id);

    ///////////////////////////////////
    // Api + Site example that works
    ///////////////////////////////////

    let site;

    const api = new sst.Api(this, "Api", {
      defaultFunctionProps: {
        environment: {
          SITE_URL: Lazy.stringValue({
            produce(context) {
              return site.url;
            }
          })
        },
      },
      routes: {
        "GET /": "src/lambda.main",
      },
    });

    site = new sst.StaticSite(this, "Frontend", {
      path: "src/sites/website",
      environment: {
        API_URL: api.url,
      },
    });

    ///////////////////////////////////
    // Auth example that does NOT work
    ///////////////////////////////////

    const auth = new sst.Auth(this, "Auth", {
      cognito: {
        defaultFunctionProps: {
          environment: {
            IDENTITY_POOL_ID: Lazy.stringValue({
              produce(context) {
                return auth.cognitoUserPool.userPoolId;
              }
            })
          },
        },
        triggers: {
          preAuthentication: "src/lambda.main",
        },
      },
    });
  }
}
