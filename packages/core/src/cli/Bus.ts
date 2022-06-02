import { Response } from "../runtime";
import { Logger } from "./Logger.js";

export interface Events {
  // TODO: Temporarily here until moved to function builder
  "function.requested": {
    localID: string;
    request: {
      event: any;
      context: any;
    };
  };
  "function.responded": {
    localID: string;
    request: {
      event: any;
      context: any;
    };
    response: Response;
  };
}

type EventTypes = keyof Events;

type EventPayload<Type extends EventTypes> = {
  type: Type;
  properties: Events[Type];
};

type Subscription = {
  type: EventTypes;
  cb: (payload: any) => void;
};

export type Bus = ReturnType<typeof createBus>;

export function createBus() {
  const subscriptions: Record<string, Subscription[]> = {};

  function subscribers(type: EventTypes) {
    let arr = subscriptions[type];
    if (!arr) {
      arr = [];
      subscriptions[type] = arr;
    }
    return arr;
  }

  return {
    publish<Type extends EventTypes>(type: Type, properties: Events[Type]) {
      Logger.print("debug", `Publishing event`, type, properties);
      const payload: EventPayload<Type> = {
        type,
        properties
      };

      for (const sub of subscribers(type)) sub.cb(payload);
    },

    unsubscribe(sub: Subscription) {
      const arr = subscribers(sub.type);
      const index = arr.indexOf(sub);
      if (!index) return;
      arr.splice(index, 1);
    },

    subscribe<Type extends EventTypes>(
      type: Type,
      cb: (payload: EventPayload<Type>) => void
    ) {
      const sub: Subscription = {
        type,
        cb
      };
      subscribers(type).push(sub);
      return sub;
    }
  };
}
