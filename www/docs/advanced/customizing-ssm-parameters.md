---
title: Customizing SSM Parameters
description: "Learn how to customize the SSM parameter names used for Resource Binding."
---

You can customize the SSM parameter names that SST creates behind the scenes to power [Resource Binding](../resource-binding.md).

## Setting the SSM name prefix

To provide a prefix, open up the `sst.config.ts` and add a `ssmPrefix` field.

```ts title="sst.config.ts" {6}
export default {
  config(input) {
    return {
      name: "myapp",
      region: "us-east-1",
      ssmPrefix: "/myOrg/myTeam/",
    };
  },
  stacks(app) {},
} satisfies SSTConfig;
```

For example, the default SSM parameter name that's created for a [Bucket](../constructs/Bucket.md) is:

```
/sst/my-sst-app/dev/Bucket/myBucket/bucketName
```

With the `ssmPrefix` specified, the SSM parameter name will be:

```
/myOrg/myTeam/Bucket/myBucket/bucketName
```
