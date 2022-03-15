export function addExtensionToHandler(
  handler: string,
  extension: string
): string {
  return handler.replace(/\.[\w\d]+$/, extension);
}

export function getHandlerFullPosixPath(
  srcPath: string,
  handler: string
): string {
  return srcPath === "." ? handler : `${srcPath}/${handler}`;
}

export function getHandlerHash(posixPath: string): string {
  return `${posixPath.replace(/[\\/.]/g, "-")}-${Date.now()}`;
}
