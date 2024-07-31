declare global {
  export const $cli: {
    command: string;
    rpc: string;
    paths: {
      home: string;
      root: string;
      work: string;
      platform: string;
    };
    home: string;
  };
}

export const {};
