import "../bus.js";

declare module "../bus.js" {
  export interface Events {
    "function.ack": {
      workerID: string;
      functionID: string;
    };
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
      requestID: string;
      body: any;
    };
    "function.error": {
      workerID: string;
      functionID: string;
      errorType: string;
      errorMessage: string;
      requestID: string;
      trace: string[];
    };
  }
}
