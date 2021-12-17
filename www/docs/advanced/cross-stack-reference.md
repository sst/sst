---
title: Cross-Stack Reference 🟢
description: "Managing cross-stack references in your SST app"
---

import TabItem from "@theme/TabItem";
import MultiLanguageCode from "@site/src/components/MultiLanguageCode";

One of the more powerful capabilities CDK offers is automatic cross-stack reference. When you pass a construct from one Stack to another and reference it there, CDK will create a stack export with an auto-generated export name in the producing stack. And then importing the value in the consuming Stack.

## Adding a reference

Imagine you have a DynamoDB table in one stack, and need to add the table name as an environment variable of Lambda functions in another stack. To do this, expose the table as a class property.

<MultiLanguageCode>
<TabItem value="js">

```js {7-12} title="stacks/StackA.js"
import { Table, TableFieldType, Stack } from "@serverless-stack/resources";

export class StackA extends Stack {
  constructor(scope, id) {
    super(scope, id);

    this.table = new Table(this, "MyTable", {
      fields: {
        pk: TableFieldType.STRING,
      },
      primaryIndex: { partitionKey: "pk" },
    });
  }
}
```

</TabItem>
<TabItem value="ts">

```js {4,9-14} title="stacks/StackA.ts"
import { Table, TableFieldType, App, Stack } from "@serverless-stack/resources";

export class StackA extends Stack {
  public readonly table: Table;

  constructor(scope: App, id: string) {
    super(scope, id);

    this.table = new Table(this, "MyTable", {
      fields: {
        pk: TableFieldType.STRING,
      },
      primaryIndex: { partitionKey: "pk" },
    });
  }
}
```

</TabItem>
</MultiLanguageCode>

Then pass the Table to `StackB`.

<MultiLanguageCode>
<TabItem value="js">

```js {3} title="stacks/index.js"
const stackA = new StackA(app, "StackA");

new StackB(app, "StackB", stackA.table);
```

</TabItem>
<TabItem value="ts">

```ts {3} title="stacks/index.ts"
const stackA = new StackA(app, "StackA");

new StackB(app, "StackB", stackA.table);
```

</TabItem>
</MultiLanguageCode>

Finally, reference the table's name in `StackB`.

<MultiLanguageCode>
<TabItem value="js">

```js {10} title="stacks/StackB.js"
import { Api, Stack } from "@serverless-stack/resources";

export class StackB extends Stack {
  constructor(scope, id, table) {
    super(scope, id);

    new Api(this, "Api", {
      defaultFunctionProps: {
        environment: {
          TABLE_NAME: table.tableName,
        },
      },
      routes: {
        "GET /": "src/lambda.main",
      },
    });
  }
}
```

</TabItem>
<TabItem value="ts">

```ts {10} title="stacks/StackB.ts"
import { Api, App, Table, Stack } from "@serverless-stack/resources";

export class StackB extends Stack {
  constructor(scope: App, id: string, table: Table) {
    super(scope, id);

    new Api(this, "Api", {
      defaultFunctionProps: {
        environment: {
          TABLE_NAME: table.tableName,
        },
      },
      routes: {
        "GET /": "src/lambda.main",
      },
    });
  }
}
```

</TabItem>
</MultiLanguageCode>

Behind the scenes, the table name is exported as an output of the `StackA`. If you head over to your AWS CloudFormation console and look at `StackA`'s outputs, you should see an output with:
- Key prefixed with `ExportsOutput`, ie. `ExportsOutputRefMyTableCD79AAA0A1504A18`;
- Value of the table name, ie. `dev-demo-StackA-MyTableCD79AAA0-1CUTVKQQ47K31`;
- Export name including the stack name and the key, ie. `dev-demo-StackA:ExportsOutputRefMyTableCD79AAA0A1504A18`

And if you look at `StackB`'s template, you should see the output being imported using the `Fn::ImportValue` intrinsic notation. ie. `Fn::ImportValue: dev-demo-StackA:ExportsOutputRefMyTableCD79AAA0A1504A18`

## Order of deployment

By doing this, it will add a dependency between the Stacks. And the Stack exporting the value will be deployed before the Stack importing it. In the example above, `StackA` will be deployed first, then `StackB` will be deployed.

## Removing a reference

In the example above, if `StackB` no longer need to set the table name as Lambda environment variables, and change the `Api` to this:

```js
new Api(this, "Api", {
  routes: {
    "GET /": "src/lambda.main",
  },
});
```

When you try to deploy, you will likely get an `Export XXXX cannot be deleted` error similar to this:

```
dev-demo-StackA Export dev-demo-StackA:ExportsOutputRefMyTableCD79AAA0A1504A18 cannot be deleted as it is in use by dev-demo-StackB
```

This is because with the cross-stack reference removed, `StackB` no long depends on `StackA`, and both stacks will be deployed concurrently. However `StackA`'s output cannot be removed directly because `StackB` is still importing it.

You have to follow a 2 step process:
1. Remove the reference in `StackB`, while keeping the output exported in `StackA` by explicitly exporting table's name.

  ```js
  this.exportValue(this.table.tableName);
  ```
  **Deploy.**
2. After `StackB` finishes deploying, `StackA`'s export is no long being imported by any stack. Now we can remove the export line above.

  **Deploy again.**
