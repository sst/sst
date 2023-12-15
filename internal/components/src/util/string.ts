export function toPascalCase(str: string) {
  const strNorm = str.replace(/[^a-zA-Z0-9]/g, "");
  return strNorm.charAt(0).toUpperCase() + strNorm.slice(1);
}
