import * as trpc from "@trpc/server";
import type { Credentials } from "aws-sdk";
import AWS from "aws-sdk";
import { DendriformPatch } from "dendriform-immer-patch-optimiser";
import { Runtime } from "..";
import { EventDelegate } from "../events";
import { Issue } from "../runtime/handler/definition";
import { CredentialsOptions } from "aws-sdk/lib/credentials";

export type State = {
  app: string;
  stage: string;
  functions: Record<string, FunctionState>;
  live: boolean;
  stacks: {
    status: any;
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
  onStateChange: EventDelegate<DendriformPatch[]>;
  onDeploy: EventDelegate<void>;
};

export const router = trpc
  .router<Context>()
  .query("getCredentials", {
    async resolve({ ctx }) {
      const cfg = new AWS.Config();
      const result = await new Promise<Credentials | CredentialsOptions>(
        (res, rej) =>
          cfg.getCredentials((err, c) => {
            if (err) {
              rej(err);
              return;
            }
            res(c!);
          })
      );
      return {
        region: ctx.region,
        credentials: {
          accessKeyId: result.accessKeyId,
          secretAccessKey: result.secretAccessKey,
          sessionToken: result.sessionToken,
        },
      };
    },
  })
  .query("getState", {
    async resolve({ ctx }) {
      return ctx.state;
    },
  })
  .mutation("deploy", {
    async resolve({ ctx }) {
      return ctx.onDeploy.trigger();
    },
  })
  .subscription("onStateChange", {
    async resolve({ ctx }) {
      return new trpc.Subscription<DendriformPatch[]>((emit) => {
        const fn = ctx.onStateChange.add(emit.data);
        return () => {
          ctx.onStateChange.remove(fn);
        };
      });
    },
  });

export type Router = typeof router;
