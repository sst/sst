export function getHandlerFullPosixPath(
  srcPath: string,
  handler: string
): string {
  return srcPath === "." ? handler : `${srcPath}/${handler}`;
}

export function getHandlerHash(posixPath: string): string {
  return `${posixPath.replace(/[/.]/g, "-")}-${Date.now()}`;
}
