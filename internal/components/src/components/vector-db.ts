import path from "path";
import { ComponentResourceOptions, jsonStringify } from "@pulumi/pulumi";
import { Component } from "./component.js";
import { Postgres } from "./postgres.js";
import { PostgresTable } from "./providers/postgres-table.js";
import { Function } from "./function.js";

const DEFAULT_DATABASE = $app.stage;
const DEFAULT_TABLE = "embeddings";

export interface VectorDbArgs {
  nodes?: {};
}

export class VectorDb extends Component {
  private postgres: Postgres;
  private handler: Function;

  constructor(
    name: string,
    args?: VectorDbArgs,
    opts?: ComponentResourceOptions
  ) {
    super("sst:sst:VectorDb", name, args, opts);

    const parent = this;

    const postgres = createDB();
    createDBTable();
    const handler = createHandler();

    this.postgres = postgres;
    this.handler = handler;
    this.registerOutputs({
      _hint: this.handler.nodes.function.name.apply((name) => name),
    });

    function createDB() {
      return new Postgres(`${name}Database`, {}, { parent });
    }

    function createDBTable() {
      // Create table after the DB instance is created
      postgres.nodes.instance.arn.apply(() => {
        new PostgresTable(
          `${name}Table`,
          {
            clusterArn: postgres.nodes.cluster.arn,
            secretArn: postgres.nodes.cluster.masterUserSecrets[0].secretArn,
            databaseName: DEFAULT_DATABASE,
            tableName: DEFAULT_TABLE,
          },
          { parent }
        );
      });
    }

    function createHandler() {
      return new Function(
        `${name}Handler`,
        {
          handler: path.resolve(
            __dirname,
            "..",
            "src",
            "components",
            "functions",
            "vector-db-handler",
            "index.handler"
          ),
          url: true,
          environment: {
            CLUSTER_ARN: postgres.nodes.cluster.arn,
            SECRET_ARN: postgres.nodes.cluster.masterUserSecrets[0].secretArn,
            EMBEDDING_MODEL_ID: "amazon.titan-embed-text-v1",
            DATABASE_NAME: DEFAULT_DATABASE,
            TABLE_NAME: DEFAULT_TABLE,
          },
          policies: [
            {
              name: "revalidation-queue",
              policy: jsonStringify({
                Statement: [
                  {
                    Effect: "Allow",
                    Action: ["bedrock:InvokeModel"],
                    Resource: [
                      "arn:aws:bedrock:us-east-1::foundation-model/amazon.titan-embed-text-v1",
                    ],
                  },
                  {
                    Effect: "Allow",
                    Action: ["secretsmanager:GetSecretValue"],
                    Resource: [
                      postgres.nodes.cluster.masterUserSecrets[0].secretArn,
                    ],
                  },
                  {
                    Effect: "Allow",
                    Action: ["rds-data:ExecuteStatement"],
                    Resource: [postgres.nodes.cluster.arn],
                  },
                ],
              }),
            },
          ],
        },
        { parent }
      );
    }
  }

  public get nodes() {
    return {
      handler: this.handler,
      postgres: this.postgres,
    };
  }
}
