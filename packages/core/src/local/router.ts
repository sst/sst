import * as trpc from "@trpc/server";
import { Config } from "aws-sdk";
import { Patch } from "immer";
import { Runtime } from "..";
import { EventDelegate } from "../events";
import { Issue } from "../runtime/handler/definition";

export type State = {
  functions: Record<string, FunctionState>;
  stacks: {
    status: string;
  };
};

export type FunctionState = {
  state: "idle" | "building" | "checking";
  invocations: Invocation[];
  issues: Record<string, Issue[]>;
  warm: boolean;
};

export type Invocation = {
  id: string;
  request: any;
  response?: Runtime.Response;
  times: {
    start: number;
    end?: number;
  };
  logs: {
    message: string;
    timestamp: number;
  }[];
};

export type Context = {
  region: string;
  state: State;
  onStateChange: EventDelegate<Patch[]>;
};

export const router = trpc
  .router<Context>()
  .query("getCredentials", {
    async resolve({ ctx }) {
      const cfg = new Config();
      return {
        region: ctx.region,
        credentials: {
          accessKeyId: cfg.credentials!.accessKeyId,
          secretAccessKey: cfg.credentials!.secretAccessKey,
          sessionToken: cfg.credentials!.sessionToken,
        },
      };
    },
  })
  .query("getState", {
    async resolve({ ctx }) {
      return ctx.state;
    },
  })
  .subscription("onStateChange", {
    async resolve({ ctx }) {
      return new trpc.Subscription<Patch[]>((emit) => {
        const fn = ctx.onStateChange.add(emit.data);
        return () => {
          ctx.onStateChange.remove(fn);
        };
      });
    },
  });

export type Router = typeof router;
