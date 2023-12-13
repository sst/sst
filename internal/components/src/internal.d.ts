export declare global {
  export const $cli: {
    command: string;
    paths: {
      home: string;
      root: string;
      work: string;
    };
    backend: string;
    env: Record<string, string>;
  };
}
