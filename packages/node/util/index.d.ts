export declare function createProxy<T extends object>(constructName: string): T;
export declare function parseEnvironment(constructName: string, props: string[]): Record<string, Record<string, string>>;
export declare function buildSsmPath(constructName: string, id: string, prop: string): string;
export declare function buildSsmFallbackPath(constructName: string, id: string, prop: string): string;
export declare function ssmNameToConstructId(ssmName: string): string;
export declare function ssmNameToPropName(ssmName: string): string | undefined;
