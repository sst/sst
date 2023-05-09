---
title: Customizing SSM Parameters
description: "Learn how to customize the SSM parameter names used for Resource Binding."
---

You can customize the SSM parameter names that SST creates behind the scenes to power [Resource Binding](../resource-binding.md).

## Setting the SSM name prefix

To provide a prefix, open up the `sst.json` and add a `ssmPrefix` field.

```diff
{
  "name": "my-sst-app",
  "region": "us-east-1",
- "main": "lib/index.ts"
+ "main": "lib/index.ts",
+ "ssmPrefix": "/myOrg/myTeam/"
}
```

For example, the default SSM parameter name that's created for a [Bucket](../constructs/Bucket.md) is:

```
/sst/my-sst-app/dev/Bucket/myBucket/bucketName
```

With the `ssmPrefix` specified, the SSM parameter name will be:

```
/myOrg/myTeam/Bucket/myBucket/bucketName
```
