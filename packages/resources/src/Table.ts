import * as cdk from "@aws-cdk/core";
import * as dynamodb from "@aws-cdk/aws-dynamodb";
import { App } from "./App";

export interface TableProps {
  readonly attributes: { [key: string]: dynamodb.AttributeType },
  readonly primaryIndex: TableIndexProps;
  readonly secondaryIndexes?: { [key: string]: TableIndexProps };
  readonly tableProps?: dynamodb.TableProps;
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
      // Convenience props
      attributes,
      primaryIndex,
      secondaryIndexes,
      // Full functionality props
      tableProps,
    } = props;

    // Validate input
    if (tableProps !== undefined && attributes !== undefined) {
      throw new Error(`Cannot define both attributes and tableProps`);
    }
    if (tableProps !== undefined && primaryIndex !== undefined) {
      throw new Error(`Cannot define both primaryIndex and tableProps`);
    }
    if (tableProps !== undefined && secondaryIndexes !== undefined) {
      throw new Error(`Cannot define both secondaryIndexes and tableProps`);
    }

    const buildAttribute = (name: string): dynamodb.Attribute => {
      return {
        name,
        type: attributes[name],
      };
    }

    ////////////////////
    // Configure Table
    ////////////////////

    if (tableProps === undefined) {
      // Validate attributes
      if ( ! attributes || Object.keys(attributes).length === 0) {
        throw new Error(`No attributes defined for the "${id}" Table`);
      }

      // Validate primaryIndex
      if ( ! primaryIndex || ! primaryIndex.partitionKey) {
        throw new Error(`No primary key defined for the "${id}" Table`);
      }

      tableProps = {
        partitionKey: buildAttribute(primaryIndex.partitionKey),
        sortKey: primaryIndex.sortKey ? buildAttribute(primaryIndex.sortKey) : undefined,
        pointInTimeRecovery: true,
        billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      };
    }

    ////////////////////
    // Create Table
    ////////////////////
    this.dynamodbTable = new dynamodb.Table(this, "Table", { ...tableProps,
      tableName: tableProps.tableName || root.logicalPrefixedName(id),
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
