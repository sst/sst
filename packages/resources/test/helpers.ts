export function getStackCfResources(stack: any) {
  // @ts-ignore
  return stack._toCloudFormation().Resources;
}
