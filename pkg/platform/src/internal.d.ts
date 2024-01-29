declare global {
  export const $cli: {
    command: string;
    paths: {
      home: string;
      root: string;
      work: string;
      platform: string;
    };
    backend: string;
  };
}

export const {};
