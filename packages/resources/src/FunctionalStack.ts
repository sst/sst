import { App } from "./App";
import { Stack, StackProps } from "./Stack";

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
  const ctx: StackContext = {
    app,
    stack,
  };
  const returns = fn(ctx);
  if (returns && "then" in returns)
    return returns.then((data: any) => {
      getExports(app).set(fn, data);
    });

  getExports(app).set(fn, returns);
  return app;
}

let currentApp: App;
let currentStack: FunctionalStack<any>;
const cache = new Map<App, Map<FunctionalStack<any>, any>>();

function getExports(app: App) {
  if (!cache.has(app)) cache.set(app, new Map());
  return cache.get(app)!;
}

export function use<T>(stack: FunctionalStack<T>): T {
  if (!currentApp) throw new Error("No app is set");
  const exists = getExports(currentApp).get(stack);
  if (!exists)
    throw new Error(
      `StackWrongOrder: Initialize "${stack.name}" stack before "${currentStack?.name}" stack`
    );
  return exists;
}

export type StackContext = {
  app: App;
  stack: Stack;
};

export type FunctionalStack<T> = (ctx: StackContext) => T | Promise<T>;

class EmptyStack extends Stack {
  constructor(scope: App, id: string, props?: StackProps) {
    super(scope, id, props);
  }
}
