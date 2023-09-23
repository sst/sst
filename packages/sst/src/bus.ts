import crypto from "crypto";
import { Context } from "./context/context.js";
import { Logger } from "./logger.js";
import { lazy } from "./util/lazy.js";

export interface Events {}

export type EventTypes = keyof Events;

const DO_NOT_LOG = new Set<keyof Events>(["stacks.metadata"]);

export type EventPayload<Type extends EventTypes = EventTypes> = {
  type: Type;
  sourceID: string;
  properties: Events[Type];
};

type Subscription = {
  type: EventTypes;
  cb: (payload: any) => void;
};

export const useBus = lazy(() => {
  const subscriptions: Record<string, Subscription[]> = {};

  function subscribers(type: EventTypes) {
    let arr = subscriptions[type];
    if (!arr) {
      arr = [];
      subscriptions[type] = arr;
    }
    return arr;
  }

  const sourceID = crypto.randomBytes(16).toString("hex");

  const result = {
    sourceID,
    publish<Type extends EventTypes>(type: Type, properties: Events[Type]) {
      const payload: EventPayload<Type> = {
        type,
        properties,
        sourceID,
      };

      if (!DO_NOT_LOG.has(type)) {
        Logger.debug(`Publishing event ${JSON.stringify(payload)}`);
      }

      for (const sub of subscribers(type)) sub.cb(payload);
    },

    unsubscribe(sub: Subscription) {
      const arr = subscribers(sub.type);
      const index = arr.indexOf(sub);
      if (index < 0) return;
      arr.splice(index, 1);
    },

    subscribe<Type extends EventTypes>(
      type: Type,
      cb: (payload: EventPayload<Type>) => void
    ) {
      const sub: Subscription = {
        type,
        cb,
      };
      subscribers(type).push(sub);
      return sub;
    },
    forward<T extends EventTypes[]>(..._types: T) {
      return <Type extends T[number]>(
        type: Type,
        cb: (payload: EventPayload<Type>) => void
      ) => {
        return this.subscribe(type, cb);
      };
    },
  };

  return result;
});
