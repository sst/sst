declare module "./bus" {
  export interface Events {
    "new.event": {
      stageID: string;
    };
  }
}

export {};
