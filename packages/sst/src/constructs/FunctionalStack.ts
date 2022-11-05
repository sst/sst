import { App } from "./App.js";
import { Stack, StackProps } from "./Stack.js";

export function stack(
  app: App,
  fn: FunctionalStack<any>,
  props?: StackProps & { id?: string }
) {
  currentApp = app;
  currentStack = fn;
  const id = props?.id || fn.name;
  const exists = getExports(app).has(fn);
  if (exists)
    throw new Error(
      `StackDuplicates: Attempting to initialize stack ${id} several times`
    );

  const stack = new EmptyStack(app, id, props);
  getStacks(app).set(fn, stack);
  const ctx: StackContext = {
    app,
    stack,
  };
  const returns = fn.bind(stack)(ctx);
  if (returns && "then" in returns)
    return returns.then((data: any) => {
      getExports(app).set(fn, data);
    });

  getExports(app).set(fn, returns);
  return app;
}

let currentApp: App;
let currentStack: FunctionalStack<any>;
const exportsCache = new Map<App, Map<FunctionalStack<any>, any>>();
const stackCache = new Map<App, Map<FunctionalStack<any>, Stack>>();

function getExports(app: App) {
  if (!exportsCache.has(app)) exportsCache.set(app, new Map());
  return exportsCache.get(app)!;
}

function getStacks(app: App) {
  if (!stackCache.has(app)) stackCache.set(app, new Map());
  return stackCache.get(app)!;
}

export function use<T>(stack: FunctionalStack<T>): T {
  if (!currentApp) throw new Error("No app is set");
  const exports = getExports(currentApp);
  if (!exports.has(stack))
    throw new Error(
      `StackWrongOrder: Initialize "${stack.name}" stack before "${currentStack?.name}" stack`
    );
  return exports.get(stack);
}

export function dependsOn(stack: FunctionalStack<any>) {
  const current = getStack(currentStack);
  const target = getStack(stack)!;
  current!.addDependency(target);
}

export function getStack(stack: FunctionalStack<any>) {
  if (!currentApp) throw new Error("No app is set");
  const stacks = getStacks(currentApp);
  if (!stacks.has(stack))
    throw new Error(
      `StackWrongOrder: Initialize "${stack.name}" stack before "${currentStack?.name}" stack`
    );

  return stacks.get(stack)!;
}

export type StackContext = {
  app: App;
  stack: Stack;
};

export type FunctionalStack<T> = (
  this: Stack,
  ctx: StackContext
) => T | Promise<T>;

class EmptyStack extends Stack {
  constructor(scope: App, id: string, props?: StackProps) {
    super(scope, id, props);
  }
}
