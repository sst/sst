declare global {
  export const $cli: {
    command: string;
    paths: {
      home: string;
      root: string;
      work: string;
    };
    backend: string;
  };
}

export const {};
