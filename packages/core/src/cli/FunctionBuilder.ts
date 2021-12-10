import {
  ActorRefFrom,
  assign,
  createMachine,
  interpret,
  send,
  spawn,
} from "xstate";
import { Handler } from "../runtime/handler";
import { State } from "../state";
import picomatch from "picomatch";
import { forwardTo, log } from "xstate/lib/actions";

type Context = {
  funcs: Record<string, ActorRefFrom<typeof funcMachine>>;
  root: string;
};

type Events =
  | { type: "FILE_CHANGE"; file: string }
  | { type: "FUNCS_DEPLOYED" }
  | { type: "INVOKE"; func: string };

function broadcast(ctx: Context, evt: Events) {
  Object.values(ctx.funcs).map((f) => f.send(evt));
}

const machine = createMachine<Context, Events>({
  initial: "idle",
  states: {
    idle: {
      on: {
        FUNCS_DEPLOYED: {
          actions: assign({
            funcs: (ctx) => {
              const next = State.Function.read(ctx.root);
              const result: Context["funcs"] = {};
              for (const info of next) {
                const actor = spawn(
                  funcMachine.withContext({
                    info,
                    instructions: Handler.instructions(info),
                    dirty: false,
                    warm:
                      ctx.funcs[info.id]?.getSnapshot()?.context.warm || false,
                  }),
                  {
                    sync: true,
                    name: info.id,
                  }
                );
                result[info.id] = actor;
              }
              return result;
            },
          }),
        },
      },
    },
  },
  on: {
    FILE_CHANGE: {
      actions: broadcast,
    },
    INVOKE: {
      actions: forwardTo((_ctx, evt) => evt.func),
    },
  },
});

type FuncContext = {
  info: Handler.Opts;
  instructions: Handler.Instructions;

  warm: boolean;
  dirty: boolean;
};

type FuncEvents = Events;

const funcMachine = createMachine<FuncContext, FuncEvents>({
  initial: "idle",
  states: {
    idle: {
      on: {
        FILE_CHANGE: [
          {
            cond: (ctx, evt) => {
              if (!ctx.warm) return false;
              if (
                ctx.instructions.watcher.include.every(
                  (x) => !picomatch(x)(evt.file)
                )
              )
                return false;
              if (!ctx.instructions.shouldBuild) return true;
              return ctx.instructions.shouldBuild([evt.file]);
            },
            target: "building",
          },
        ],
      },
    },
    building: {
      entry: [
        assign<FuncContext>({
          dirty: () => false,
        }),
        (ctx) =>
          console.log(
            `Functions: Building ${ctx.info.srcPath} ${ctx.info.handler}`
          ),
      ],
      invoke: {
        src: async (ctx) => await ctx.instructions.build?.(),
        onDone: [
          {
            cond: (ctx) => ctx.dirty,
            target: "building",
          },
          { target: "checking" },
        ],
      },
    },
    checking: {
      on: {
        FILE_CHANGE: "building",
      },
    },
  },
  on: {
    FILE_CHANGE: {
      actions: assign({
        dirty: (_ctx) => true,
      }),
    },
    INVOKE: {
      actions: assign({
        warm: (_ctx) => true,
      }),
    },
  },
});

type Opts = {
  root: string;
};
export function useFunctionBuilder(root: string) {
  const svc = interpret(
    machine.withContext({
      root,
      funcs: {},
    })
  ).start();

  return svc;
}
