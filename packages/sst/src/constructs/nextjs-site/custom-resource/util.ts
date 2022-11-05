/* eslint-disable no-console */

export function log(title: any, ...args: any[]) {
  console.log(
    "[provider-framework]",
    title,
    ...args.map((x) =>
      typeof x === "object" ? JSON.stringify(x, undefined, 2) : x
    )
  );
}
