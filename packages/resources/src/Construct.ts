export interface ISstConstructInfo {
  type: string;
  stack: string;
  functionArn?: string;
}

export interface ISstConstruct {
  getConstructInfo(): ISstConstructInfo[];
}

export function isSstConstruct(input: any): input is ISstConstruct {
  return "getConstructInfo" in input;
}
