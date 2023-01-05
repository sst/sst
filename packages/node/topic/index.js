import { createProxy, parseEnvironment } from "../util/index.js";
export const Topic = createProxy("Topic");
Object.assign(Topic, parseEnvironment("Topic", ["topicArn"]));
