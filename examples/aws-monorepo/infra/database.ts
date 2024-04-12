export const database = new sst.aws.Dynamo("Database", {
  fields: {
    PK: "string",
    SK: "string",
  },
  primaryIndex: {
    hashKey: "PK",
    rangeKey: "SK",
  },
});
