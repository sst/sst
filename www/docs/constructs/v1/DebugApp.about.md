The DebugApp construct is used internally by SST to
- Deploy the [`DebugStack`](DebugStack.md). It contains the resources that powers [Live Lambda Development](/live-lambda-development.md).
- Automatically prefix the debug stack name with the stage and app name.

It extends [`cdk.App`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.App.html). It's made available as the `app` in the `debugApp()` callback in the `stacks/index.js` of your SST app.

```js
export function debugApp(app) {
  new sst.DebugStack(app, "debug-stack");
}
```

Since it is initialized internally, the props that are passed to `DebugApp` cannot be changed.

## Examples

### Access Properties
```js
export function debugApp(app) {
  app.name;
  app.stage;
  app.region;
  app.account;
}
```
