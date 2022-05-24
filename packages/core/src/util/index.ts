export * as Environment from "./environment.js";
export * as Paths from "./paths.js";

export async function weakImport(pkg: string) {
  try {
    return await import(pkg);
  } catch {
    return {};
  }
}
