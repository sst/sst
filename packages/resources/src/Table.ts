import * as cdk from "@aws-cdk/core";
import * as dynamodb from "@aws-cdk/aws-dynamodb";
import { App } from "./App";
import { isConstructOf } from "./util/construct";

export enum TableFieldType {
  BINARY = dynamodb.AttributeType.BINARY,
  NUMBER = dynamodb.AttributeType.NUMBER,
  STRING = dynamodb.AttributeType.STRING,
}

/////////////////////
// Interfaces
/////////////////////

export interface TableProps {
  readonly fields?: { [key: string]: TableFieldType };
  readonly primaryIndex?: TableIndexProps;
  readonly secondaryIndexes?: { [key: string]: TableIndexProps };
  readonly dynamodbTable?: dynamodb.Table | TableCdkProps;
}

export interface TableIndexProps {
  readonly partitionKey: string;
  readonly sortKey?: string;
  readonly indexProps?: TableCdkIndexProps;
}

export type TableCdkProps = Omit<
  dynamodb.TableProps,
  "partitionKey" | "sortKey"
>;

export type TableCdkIndexProps = Omit<
  dynamodb.GlobalSecondaryIndexProps,
  "indexName" | "partitionKey" | "sortKey"
>;

/////////////////////
// Construct
/////////////////////

export class Table extends cdk.Construct {
  public readonly dynamodbTable: dynamodb.Table;

  constructor(scope: cdk.Construct, id: string, props: TableProps) {
    super(scope, id);

    const root = scope.node.root as App;
    const { fields, primaryIndex, secondaryIndexes, dynamodbTable } = props;

    ////////////////////
    // Create Table
    ////////////////////

    this.validateFieldsAndIndexes(id, props);

    if (isConstructOf(dynamodbTable as dynamodb.Table, "aws-dynamodb.Table")) {
      // Validate "fields" is not configured
      if (fields !== undefined) {
        throw new Error(
          `Cannot configure the "fields" when "dynamodbTable" is a construct in the "${id}" Table`
        );
      }
      this.dynamodbTable = dynamodbTable as dynamodb.Table;
    } else {
      let dynamodbTableProps = (dynamodbTable || {}) as dynamodb.TableProps;

      // Validate "fields" is configured
      if (fields === undefined) {
        throw new Error(`Missing "fields" in the "${id}" Table`);
      }

      // Validate dynamodbTableProps does not contain "partitionKey" and "sortKey"
      if (dynamodbTableProps.partitionKey) {
        throw new Error(
          `Cannot configure the "dynamodbTableProps.partitionKey" in the "${id}" Table`
        );
      }
      if (dynamodbTableProps.sortKey) {
        throw new Error(
          `Cannot configure the "dynamodbTableProps.sortKey" in the "${id}" Table`
        );
      }

      if (fields && primaryIndex) {
        dynamodbTableProps = {
          ...dynamodbTableProps,
          partitionKey: this.buildAttribute(fields, primaryIndex.partitionKey),
          sortKey: primaryIndex.sortKey
            ? this.buildAttribute(fields, primaryIndex.sortKey)
            : undefined,
        };
      }

      this.dynamodbTable = new dynamodb.Table(this, "Table", {
        tableName: root.logicalPrefixedName(id),
        pointInTimeRecovery: true,
        billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
        ...(dynamodbTableProps as dynamodb.TableProps),
      });
    }

    //////////////////////////////
    // Create Secondary Indexes
    //////////////////////////////

    if (fields && secondaryIndexes) {
      Object.keys(secondaryIndexes).forEach((indexName) => {
        const { partitionKey, sortKey, indexProps = {} } = secondaryIndexes[
          indexName
        ];

        // Validate indexProps does not contain "indexName", "partitionKey" and "sortKey"
        if ((indexProps as dynamodb.GlobalSecondaryIndexProps).indexName) {
          throw new Error(
            `Cannot configure the "indexProps.indexName" in the "${indexName}" index of the "${id}" Table`
          );
        }
        if ((indexProps as dynamodb.GlobalSecondaryIndexProps).partitionKey) {
          throw new Error(
            `Cannot configure the "indexProps.partitionKey" in the "${indexName}" index of the "${id}" Table`
          );
        }
        if ((indexProps as dynamodb.GlobalSecondaryIndexProps).sortKey) {
          throw new Error(
            `Cannot configure the "indexProps.sortKey" in the "${indexName}" index of the "${id}" Table`
          );
        }

        this.dynamodbTable.addGlobalSecondaryIndex({
          indexName,
          partitionKey: this.buildAttribute(fields, partitionKey),
          sortKey: sortKey ? this.buildAttribute(fields, sortKey) : undefined,
          ...indexProps,
        });
      });
    }
  }

  validateFieldsAndIndexes(id: string, props: TableProps): void {
    const { fields, primaryIndex, secondaryIndexes } = props;

    // Validate "fields"
    if (fields && Object.keys(fields).length === 0) {
      throw new Error(`No fields defined for the "${id}" Table`);
    }

    // Validate "primaryIndex"
    if (primaryIndex && !primaryIndex.partitionKey) {
      throw new Error(
        `Missing "partitionKey" in primary index for the "${id}" Table`
      );
    }

    // Validate "fields" and "primaryIndex" co-exists
    if (fields) {
      if (!primaryIndex) {
        throw new Error(`Missing "primaryIndex" in "${id}" Table`);
      }
    } else {
      if (primaryIndex) {
        throw new Error(
          `Cannot configure the "primaryIndex" without setting the "fields" in "${id}" Table`
        );
      }
      if (secondaryIndexes) {
        throw new Error(
          `Cannot configure the "secondaryIndexes" without setting the "fields" in "${id}" Table`
        );
      }
    }
  }

  buildAttribute(
    fields: { [key: string]: TableFieldType },
    name: string
  ): dynamodb.Attribute {
    return {
      name,
      type: this.convertTableFieldTypeToAttributeType(fields[name]),
    };
  }

  convertTableFieldTypeToAttributeType(
    fieldType: TableFieldType
  ): dynamodb.AttributeType {
    if (fieldType === TableFieldType.BINARY) {
      return dynamodb.AttributeType.BINARY;
    } else if (fieldType === TableFieldType.NUMBER) {
      return dynamodb.AttributeType.NUMBER;
    } else {
      return dynamodb.AttributeType.STRING;
    }
  }
}
