/* eslint-disable no-console */

export function getEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`The environment variable "${name}" is not defined`);
  }
  return value;
}

export function log(title: any, ...args: any[]) {
  console.log('[provider-framework]', title, ...args.map(x => typeof(x) === 'object' ? JSON.stringify(x, undefined, 2) : x));
}
