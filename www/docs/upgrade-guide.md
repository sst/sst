---
title: Upgrade Guide
description: "Upgrade guide for SST"
---

## Upgrade to v1.16

- Stacks: id needs to be unique and match `[a-zA-Z]([a-zA-Z0-9_])+`, change the id to a unique id, and pass the original id into `cdk.id`. This ensure the original id is still used as the CloudFormation logical ID. And it will not result in the resource being recreated.

For example, if you have two buckets with the same id.

```ts
// Change
new Bucket(this, "bucket");
new Bucket(this, "bucket");

// To
new Bucket(this, "usersBucket", {
  cdk: {
    id: "bucket"
  }
});
new Bucket(this, "adminBucket", {
  cdk: {
    id: "bucket"
  }
});
```

- Function code:
```ts
// Change
Job.run("MyJob", payload);

// To
Job.MyJob.run(payload);
```

- Stack code: use `bind` instead of `config`
```ts
// Change
new Function(stack, "myFn", {
  config: [MY_STRIPE_KEY],
});

// To
new Function(stack, "myFn", {
  bind: [MY_STRIPE_KEY],
});
```

- Use `bind` instead of `load-config` command

## Upgrade to v1.0

Link to the Migrate to v1.0 doc