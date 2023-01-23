export async function loadAssembly(from: string) {
  const { CloudAssembly } = await import("aws-cdk-lib/cx-api");
  return new CloudAssembly(from);
}