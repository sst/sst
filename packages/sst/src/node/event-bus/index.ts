import { createProxy, getVariables } from "../util/index.js";

export interface EventBusResources {}

export const EventBus = createProxy<EventBusResources>("EventBus");
Object.assign(EventBus, getVariables("EventBus"));
