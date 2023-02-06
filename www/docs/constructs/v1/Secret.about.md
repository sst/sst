The `Config.Secret` construct is a higher level CDK construct that makes it easy to create secret environment variables in the app.

## Examples

```js
import { Config } from "@serverless-stack/resources";

new Config.Secret(stack, "STRIPE_KEY");
```