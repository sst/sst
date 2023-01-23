import type { CloudAssembly } from "aws-cdk-lib/cx-api";

export async function loadAssembly(from: string) {
  const { CloudAssembly } = await import("aws-cdk-lib/cx-api");
  return new CloudAssembly(from);
}

export function logicalIdToCdkPath(assembly: CloudAssembly, stack: string, logicalId: string) {
  const found =
    Object.entries(
      assembly.manifest.artifacts?.[stack].metadata || {}
    ).find(
      ([_key, value]) =>
        value[0]?.type === "aws:cdk:logicalId" && value[0]?.data === logicalId
    )?.[0];

  if (!found) {
    return logicalId;
  }

  return found
    .split("/")
    .filter(Boolean)
    .slice(1, -1)
    .join("/");
}