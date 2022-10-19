import { createProxy, parseEnvironment } from "../util";
export const EventBus = createProxy("EventBus");
Object.assign(EventBus, parseEnvironment("EventBus", ["eventBusName"]));
