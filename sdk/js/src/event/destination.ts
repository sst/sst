import { Prettify } from "../util/prettify.js";

export interface Payload {
  type: string;
  properties: any;
  metadata: any;
}

type Publisher = (properties: any, payload: Payload) => void;

const Publishers = {
  "sst.aws.Bus": (properties: { name: string }, payload: Payload) => {},
} satisfies Record<string, Publisher>;
type Publishers = typeof Publishers;

export type Destinations = {
  [key in keyof Publishers]: Prettify<
    {
      type: key;
    } & Parameters<Publishers[key]>[0]
  >;
}[keyof Publishers];

export function publish(destination: Destinations, payload: Payload) {
  return Publishers[destination.type](destination, payload);
}
