import * as trpc from "@trpc/server";
import type { Credentials } from "aws-sdk";
import AWS from "aws-sdk";
import { DendriformPatch } from "dendriform-immer-patch-optimiser";
import { useProject } from "../../app.js";
import { useBus } from "../../bus.js";
import { useAWSCredentials } from "../../credentials.js";

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
  issues: Record<string, any[]>;
  warm: boolean;
};

export type Invocation = {
  id: string;
  request: any;
  response?: any;
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
  state: State;
};

export const router = trpc
  .router<Context>()
  .query("getCredentials", {
    async resolve({ ctx }) {
      const project = useProject();
      const credentials = await useAWSCredentials();
      return {
        region: project.region,
        credentials: {
          accessKeyId: credentials.accessKeyId,
          secretAccessKey: credentials.secretAccessKey,
          sessionToken: credentials.sessionToken,
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
      return;
    },
  })
  .subscription("onStateChange", {
    async resolve({ ctx }) {
      const bus = useBus();
      return new trpc.Subscription<DendriformPatch[]>((emit) => {
        const sub = bus.subscribe("local.patches", (evt) => {
          emit.data(evt.properties);
        });
        return () => {
          bus.unsubscribe(sub);
        };
      });
    },
  });

export type Router = typeof router;
