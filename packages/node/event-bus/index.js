import { createProxy, parseEnvironment } from "../util/index.js";
export const EventBus = createProxy("EventBus");
Object.assign(EventBus, parseEnvironment("EventBus", ["eventBusName"]));
