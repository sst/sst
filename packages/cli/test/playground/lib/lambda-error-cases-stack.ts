import * as sst from "@serverless-stack/resources";

export class MainStack extends sst.Stack {
  constructor(scope: sst.App, id: string) {
    super(scope, id);

    const nodeHandlers = {
      initError: {
        handler: "src/lambda-error-cases/nodeErrors.consoleLog",
        environment: { TRIGGER_INIT_ERROR: "true" },
      },
      consoleLog: {},
      consoleWarn: {},
      consoleError: {},
      invokeError: {},
      uncaughtException: {},
      unhandledPromiseRejection: {},
      timeout: {
        timeout: 3,
      },
      oom: {
        timeout: 20,
        memorySize: 128,
      },
    };
    Object.entries(nodeHandlers).forEach(([key, value]) => {
      new sst.Function(this, key, {
        handler: `src/lambda-error-cases/nodeErrors.${key}`,
        ...value,
      });
    });

    const pythonHandlers = {
      initError: {
        handler: "pythonErrors.consoleLog",
        environment: { TRIGGER_INIT_ERROR: "true" },
      },
      logLevels: {},
      throw: {},
      timeout: {
        timeout: 3,
      },
      oom: {
        timeout: 20,
        memorySize: 128,
      },
    };
    Object.entries(pythonHandlers).forEach(([key, value]) => {
      new sst.Function(this, `${key}Python`, {
        runtime: "python3.8",
        srcPath: "src/lambda-error-cases",
        handler: `pythonErrors.${key}`,
        ...value,
      });
    });
  }
}
