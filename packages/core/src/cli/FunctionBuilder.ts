import {
  ActorRefFrom,
  assign,
  createMachine,
  interpret,
  InterpreterFrom,
  StateFrom,
} from "xstate";
import { Handler } from "../runtime/handler";
import { State } from "../state";
import picomatch from "picomatch";
import { EventDelegate } from "../events";
import chokidar from "chokidar";

type Context = {
  funcs: Record<string, InterpreterFrom<typeof funcMachine>>;
  chokidar?: chokidar.FSWatcher;
};

type Opts = {
  root: string;
  checks: Record<string, boolean>;
};

export function useFunctionBuilder(opts: Opts) {
  const ctx: Context = {
    funcs: {},
  };

  const onTransition = new EventDelegate<{
    state: StateFrom<typeof funcMachine>;
    actor: InterpreterFrom<typeof funcMachine>;
  }>();

  const onChange = new EventDelegate<{
    ctx: StateFrom<typeof funcMachine>["context"];
    actor: InterpreterFrom<typeof funcMachine>;
  }>();

  function reload() {
    for (const actor of Object.values(ctx.funcs)) {
      actor.stop();
    }

    const defs = State.Function.read(opts.root);
    const result: Context["funcs"] = {};
    for (const info of defs) {
      const actor = createFuncMachine({
        ctx,
        info,
        checks: opts.checks,
      });
      actor.onTransition((state) =>
        onTransition.trigger({
          state,
          actor,
        })
      );
      actor.onChange((ctx) =>
        onChange.trigger({
          ctx,
          actor,
        })
      );
      result[info.id] = actor;
    }
    ctx.funcs = result;
    return result;
  }

  function broadcast(event: FuncEvents) {
    Object.values(ctx.funcs).map((f) => f.send(event));
  }

  function send(id: string, event: FuncEvents) {
    const func = ctx.funcs[id];
    return func.send(event);
  }

  return {
    ctx,
    reload,
    send,
    broadcast,
    onTransition,
    onChange,
  };
}

type FuncMachineOpts = {
  ctx: Context;
  info: Handler.Opts;
  checks: FuncContext["checks"];
};

function createFuncMachine(opts: FuncMachineOpts) {
  return interpret(
    funcMachine.withContext({
      info: opts.info,
      instructions: Handler.instructions(opts.info),
      dirty: false,
      checks: opts.checks,
      warm: opts.ctx.funcs[opts.info.id]?.getSnapshot()?.context.warm || false,
    }),
    {
      name: opts.info.id,
    }
  ).start();
}

type FileChangeEvent = { type: "FILE_CHANGE"; file: string };
type InvokeEvent = { type: "INVOKE" };

type FuncEvents = FileChangeEvent | InvokeEvent;

type FuncContext = {
  info: Handler.Opts;
  instructions: Handler.Instructions;
  checks: Opts["checks"];
  buildStart?: number;
  warm: boolean;
  dirty: boolean;
};

function shouldBuild(ctx: FuncContext, evt: FileChangeEvent) {
  if (!ctx.warm) return false;
  if (ctx.instructions.watcher.include.every((x) => !picomatch(x)(evt.file)))
    return false;
  if (!ctx.instructions.shouldBuild) return true;
  return ctx.instructions.shouldBuild([evt.file]);
}

const funcMachine = createMachine<FuncContext, FuncEvents>({
  initial: "idle",
  states: {
    idle: {
      on: {
        FILE_CHANGE: [
          {
            cond: shouldBuild,
            target: "building",
          },
        ],
      },
    },
    building: {
      entry: assign<FuncContext>({
        dirty: () => false,
        buildStart: () => Date.now(),
      }),
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
      on: {
        FILE_CHANGE: {
          actions: assign({
            dirty: (ctx, evt) => shouldBuild(ctx, evt),
          }),
        },
      },
    },
    checking: {
      invoke: {
        src: async (ctx) => {
          const promises = Object.entries(ctx.instructions.checks || {})
            .filter(([key]) => ctx.checks[key])
            .map(([, value]) => {
              return value();
            });
          await Promise.all(promises);
        },
        onDone: {
          target: "idle",
        },
      },
      on: {
        FILE_CHANGE: "building",
      },
    },
  },
  on: {
    INVOKE: {
      actions: assign({
        warm: (_ctx) => true,
      }),
    },
  },
});
