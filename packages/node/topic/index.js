import { createProxy, parseEnvironment } from "../util";
export const Topic = createProxy("Topic");
Object.assign(Topic, parseEnvironment("Topic", ["topicArn"]));
