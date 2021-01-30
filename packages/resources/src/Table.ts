import * as cdk from "@aws-cdk/core";
import * as dynamodb from "@aws-cdk/aws-dynamodb";
import { App } from "./App";

export interface TableProps {
  readonly fields: { [key: string]: dynamodb.AttributeType },
  readonly primaryIndex: TableIndexProps;
  readonly secondaryIndexes?: { [key: string]: TableIndexProps };
}

export interface TableIndexProps {
  readonly partitionKey: string;
  readonly sortKey?: string;
}

export class Table extends cdk.Construct {
  public readonly dynamodbTable: dynamodb.Table;

  constructor(scope: cdk.Construct, id: string, props: TableProps) {
    super(scope, id);

    const root = scope.node.root as App;
    let {
      fields,
      primaryIndex,
      secondaryIndexes,
    } = props;

    const buildAttribute = (name: string): dynamodb.Attribute => {
      return {
        name,
        type: fields[name],
      };
    }

    ////////////////////
    // Create Table
    ////////////////////

    // Validate fields
    if (fields === undefined || Object.keys(fields).length === 0) {
      throw new Error(`No fields defined for the "${id}" Table`);
    }

    // Validate primaryIndex
    if (primaryIndex === undefined) {
      throw new Error(`No primary index defined for the "${id}" Table`);
    }
    else if ( ! primaryIndex.partitionKey) {
      throw new Error(`No partition key defined in primary index for the "${id}" Table`);
    }

    this.dynamodbTable = new dynamodb.Table(this, "Table", {
      tableName: root.logicalPrefixedName(id),
      partitionKey: buildAttribute(primaryIndex.partitionKey),
      sortKey: primaryIndex.sortKey ? buildAttribute(primaryIndex.sortKey) : undefined,
      pointInTimeRecovery: true,
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    });

    //////////////////////////////
    // Create Secondary Indexes
    //////////////////////////////

    if (secondaryIndexes !== undefined) {
      Object.keys(secondaryIndexes).forEach(indexName => {
        if (secondaryIndexes !== undefined) {
          const { partitionKey, sortKey } = secondaryIndexes[indexName];
          this.dynamodbTable.addGlobalSecondaryIndex({
            indexName,
            partitionKey: buildAttribute(partitionKey),
            sortKey: sortKey ? buildAttribute(sortKey) : undefined,
          });
        }
      });
    }
  }
}
