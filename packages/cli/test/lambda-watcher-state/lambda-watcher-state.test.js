const LambdaWatcherState = require("../../scripts/util/LambdaWatcherState");

test("watcher", async () => {
  let lambdaState;

  const onTranspileNode = jest.fn(() =>
    lambdaState.handleBuildSucceeded(".", "lambda.main", {
      tsconfig: "tsconfig",
      esbuilder: "esbuild-process",
      outEntryPoint: "handler",
      inputFiles: [ "a.js", "b.js" ],
    })
  );
  const onRunLint = jest.fn(() => "lint-process");
  const onRunTypeCheck = jest.fn(() => "type-check-process");
  const onCompileGo = jest.fn(() =>
    lambdaState.handleBuildSucceeded(".", "lambda.go", {
      outEntryPoint: "handler",
      inputFiles: [],
    })
  );
  lambdaState = new LambdaWatcherState({
    lambdaHandlers: [
      { srcPath: ".", handler: "lambda.main", runtime: "nodejs12.x", bundle: { nodeModules: [] } },
      { srcPath: ".", handler: "lambda.go", runtime: "go1.x" },
    ],
    onTranspileNode,
    onRunLint,
    onRunTypeCheck,
    onCompileGo,
  });
  await lambdaState.runInitialBuild();

  expect(onTranspileNode).toBeCalledTimes(1);
  expect(onRunLint).toBeCalledTimes(1);
  expect(onRunTypeCheck).toBeCalledTimes(1);
  expect(onCompileGo).toBeCalledTimes(1);
  expect(lambdaState.state.isProcessingLambdaChanges).toBeFalsy();
  expect(lambdaState.state.entryPointsData).toMatchObject({
    './lambda.main': {
      srcPath: '.',
      handler: 'lambda.main',
      runtime: 'nodejs12.x',
      bundle: { nodeModules: [] },
      hasError: false,
      buildPromise: null,
      inputFiles: ["a.js", "b.js"],
      needsReBuild: 0,
      outEntryPoint: "handler",
      pendingRequestCallbacks: [],
      tsconfig: "tsconfig",
      esbuilder: "esbuild-process",
    },
    './lambda.go': {
      srcPath: '.',
      handler: 'lambda.go',
      runtime: 'go1.x',
      hasError: false,
      buildPromise: null,
      inputFiles: [],
      needsReBuild: 0,
      outEntryPoint: "handler",
      pendingRequestCallbacks: [],
      tsconfig: undefined,
      esbuilder: undefined,
    },
  });
  expect(lambdaState.state.srcPathsData).toMatchObject({
    '.': {
      srcPath: '.',
      tsconfig: "tsconfig",
      inputFiles: ["a.js", "b.js"],
      lintProcess: "lint-process",
      needsReCheck: false,
      typeCheckProcess: "type-check-process",
    }
  });

  expect(Object.keys(lambdaState.state.watchedNodeFilesIndex)).toHaveLength(2);
  expect(lambdaState.state.watchedNodeFilesIndex).toMatchObject({
    "a.js": ["./lambda.main"],
    "b.js": ["./lambda.main"],
  });
});
