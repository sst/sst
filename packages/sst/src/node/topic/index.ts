import { createProxy, getVariables } from "../util/index.js";

export interface TopicResources {}

export const Topic = createProxy<TopicResources>("Topic");
Object.assign(Topic, await getVariables("Topic"));
