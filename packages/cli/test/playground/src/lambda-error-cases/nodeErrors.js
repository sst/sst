if (process.env.TRIGGER_INIT_ERROR) {
  throw new Error("this is a throw outside of the handler");
}

export function consoleLog() {
  console.log("this is a log");
  console.log("this is a two\nline log");
  console.log("test\\period");
  console.log("test/period");
  console.log(`test { method: 'test', path: 'abc' } period`);
  console.log({ a: "1", b: "2" });
  console.log(JSON.stringify({ a: "1", b: "2" }));
  console.log(new Error().stack);
  return true;
}

export function consoleWarn() {
  console.warn("this is a warn");
  return true;
}

export function consoleError() {
  console.error("this is an error");
  return true;
}

export function invokeError() {
  throw new Error("this is a sync throw");
}

export async function uncaughtException() {
  return new Promise(() => {
    throw new Error("this is an uncaught exception");
  });
}

export async function unhandledPromiseRejection(_event, _context, callback) {
  callback(null, true);
}

export function timeout() {
  const now = Date.now();
  let a;
  while (Date.now() < now + 15000) {
    a = "a";
  }
  console.log(a);
}

export function oom() {
  allocMem();
}

function allocMem() {
  let bigList = Array(4096000).fill(1);
  return bigList.concat(allocMem());
}
