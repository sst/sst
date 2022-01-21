import { ApolloApi, ApolloApiProps } from "./ApolloApi";
import { App } from "./App";
import spawn from "cross-spawn";
import { Construct } from "constructs";
import { ApiPayloadFormatVersion } from "./Api";

export type GraphQLApiProps = ApolloApiProps & {
  /**
   * Path to graphql-codegen configuration file
   */
  codegen?: string;
};

export class GraphQLApi extends ApolloApi {
  private readonly codegen?: string;

  constructor(scope: Construct, id: string, props: GraphQLApiProps) {
    if (props.codegen) {
      const app = App.of(scope) as App;
      if (!app.local) {
        const result = spawn.sync(
          "npx",
          ["graphql-codegen", "-c", props.codegen],
          {
            stdio: "inherit",
          }
        );
        if (result.status !== 0) {
          throw new Error(
            `Failed to generate the schema for the "${id}" ApolloApi`
          );
        }
      }
    }
    super(scope, id, {
      ...props,
      defaultPayloadFormatVersion: ApiPayloadFormatVersion.V2,
    });
    this.codegen = props.codegen;
  }

  public getConstructMetadata() {
    const parent = super.getConstructMetadata();
    return {
      ...parent,
      local: {
        codegen: this.codegen,
      },
    };
  }
}
