import {} from "../bus/index.js";

declare module "../bus/index.js" {
  export interface Events {
    "function.invoked": {
      workerID: string;
      functionID: string;
      requestID: string;
      env: Record<string, any>;
      event: any;
      context: any;
      deadline: number;
    };
    "function.success": {
      workerID: string;
      functionID: string;
      body: any;
    };
    "function.error": {
      workerID: string;
      functionID: string;
      errorType: string;
      errorMessage: string;
      trace: string[];
    };
  }
}
