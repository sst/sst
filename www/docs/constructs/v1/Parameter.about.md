The `Config.Parameter` construct is a higher level CDK construct that makes it easy to create environment variables in the app.

## Examples

```js {5-7}
import { Config, Topic } from "@serverless-stack/resources";

const topic = new Topic(stack, "USER_UPDATED");

new Config.Parameter(stack, "USER_UPDATED_TOPIC_NAME", {
  value: topic.topicName,
});
```