import url from "url";
export async function dynamicImport(input: string) {
  const { href } = url.pathToFileURL(input);
  return import(href);
}
