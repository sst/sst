import * as cdk from "@aws-cdk/core";
import { Api, ApiProps, ApiPayloadFormatVersion } from "./Api";
import { FunctionDefinition } from "./Function";

/////////////////////
// Interfaces
/////////////////////

export interface ApolloApiProps extends Omit<ApiProps, "routes"> {
  readonly server: FunctionDefinition;
}

/////////////////////
// Construct
/////////////////////

export class ApolloApi extends Api {
  constructor(scope: cdk.Construct, id: string, props: ApolloApiProps) {
    const { server, defaultPayloadFormatVersion } = props || {};

    // Validate server
    if (!server) {
      throw new Error(`Missing "server" in the "${id}" ApolloApi`);
    }

    // Validate routes
    const { routes } = props as ApiProps;
    if (routes) {
      throw new Error(
        `Please use the "server" option instead of the "routes" to configure the handler for the "${id}" ApolloApi`
      );
    }

    super(scope, id, {
      ...props,
      defaultPayloadFormatVersion:
        defaultPayloadFormatVersion || ApiPayloadFormatVersion.V1,
      routes: {
        "ANY /": server,
      },
    });
  }
}
