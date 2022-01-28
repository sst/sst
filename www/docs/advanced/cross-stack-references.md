---
title: Cross-Stack References
description: "Managing cross-stack references in your Serverless Stack (SST) app."
---

One of the more powerful features of CDK is, automatic cross-stack references. When you pass a construct from one [`Stack`](../constructs/Stack.md) to another stack and reference it there; CDK will create a stack export with an auto-generated export name in the stack with the construct. And then import that value in the stack that's referencing it.

## Adding a reference

So imagine you have a DynamoDB [`Table`](../constructs/Table.md) in one stack, and you need to add the table name as an environment variable (for the Lambda functions) in another stack.

To do this, start by exposing the table as a class property.

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

Then pass the table to `StackB`.

```js {3} title="stacks/index.js"
const stackA = new StackA(app, "StackA");

new StackB(app, "StackB", stackA.table);
```

Finally, reference the table's name in `StackB`.

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

Behind the scenes, the table name is exported as an output of `StackA`. If you head over to your AWS CloudFormation console and look at `StackA`'s outputs, you should see an output with:

- The key prefixed with `ExportsOutput`. Something like `ExportsOutputRefMyTableCD79AAA0A1504A18`.
- The value of the table name, ie. `dev-demo-StackA-MyTableCD79AAA0-1CUTVKQQ47K31`.
- And the export name will include the stack name and the key, ie. `dev-demo-StackA:ExportsOutputRefMyTableCD79AAA0A1504A18`.

And if you look at `StackB`'s template, you should see the output being imported using the `Fn::ImportValue` intrinsic notation. For example, `Fn::ImportValue: dev-demo-StackA:ExportsOutputRefMyTableCD79AAA0A1504A18`.

## Order of deployment

By doing this, it will add a dependency between the stacks. And the stack exporting the value will be deployed before the stack importing it. In the example above, `StackA` will be deployed first, and then `StackB` will be deployed later.

## Removing a reference

Now suppose in the example above, `StackB` no longer needs the table name as a Lambda environment variable. So we remove the `environment` option and change the `Api` to:

```js
new Api(this, "Api", {
  routes: {
    "GET /": "src/lambda.main",
  },
});
```

When you try to deploy your app, you'll likely get an `Export XXXX cannot be deleted` error. It'll look similar to this:

```
dev-demo-StackA Export dev-demo-StackA:ExportsOutputRefMyTableCD79AAA0A1504A18 cannot be deleted as it is in use by dev-demo-StackB
```

This will happen because:

- With the cross-stack references removed, `StackB` no long depends on `StackA`, and both stacks will get deployed concurrently.
- While they are both being deployed, AWS will find that `StackA`'s output cannot be removed because `StackB` is still importing it.

To fix this, we need to first remove `StackB`'s dependency on `StackA`, deploy it, then remove the export. It'll be a 2-step process:

1. After we remove the reference in `StackB`, we'll tell CDK that we still want the output exported in `StackA`. We can do this by explicitly calling `this.exportValue`.

   ```js {12} title="stacks/StackA.js"
   export class StackA extends Stack {
     constructor(scope, id) {
       super(scope, id);
   
       this.table = new Table(this, "MyTable", {
         fields: {
           pk: TableFieldType.STRING,
         },
         primaryIndex: { partitionKey: "pk" },
       });

       this.exportValue(this.table.tableName);
     }
   }
   ```
 
   **Deploy.**

   This changes the reference in `StackB` but leaves `StackA` as-is.

2. After `StackB` finishes deploying, `StackA`'s export is no longer being imported. So you can remove the `this.exportValue` line.

   **And deploy again.**
