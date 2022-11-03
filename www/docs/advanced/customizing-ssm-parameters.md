---
title: Customizing SSM Parameters
description: "Learn how to customize SSM parameter names for Resource Binding in your SST app."
---

You can customize the SSM parameter names created by SST behind the scene to power [Resource Binding](../resource-binding.md).

## Setting the SSM name prefix

To provide a name prefix, open up `sst.json` and add a `ssmPrefix` field.

```diff
{
  "name": "my-sst-app",
  "region": "us-east-1",
- "main": "lib/index.ts"
+ "main": "lib/index.ts",
+ "ssmPrefix": "/myOrg/myTeam"
}
```

For example, the default SSM parameter name created for a [Bucket](../constructs/Bucket.md) is:
```
/sst/my-sst-app/dev/Bucket/myBucket/bucketName
```

With `ssmPrefix` specified, the SSM parameter name will be:

```
/myOrg/myTeam/sst/my-sst-app/dev/Bucket/myBucket/bucketName
```