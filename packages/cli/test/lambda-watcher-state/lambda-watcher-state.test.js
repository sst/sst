const LambdaWatcherState = require("../../scripts/util/LambdaWatcherState");

test("build", async () => {
  let lambdaState;

  const onTranspileNode = jest.fn(({ onSuccess }) =>
    onSuccess({
      tsconfig: "tsconfig",
      esbuilder: "esbuild-process",
      outEntryPoint: "handler",
      inputFiles: ["a.js", "b.js"],
    })
  );
  const onRunLint = jest.fn(() => "lint-process");
  const onRunTypeCheck = jest.fn(() => "type-check-process");
  const onCompileGo = jest.fn(({ onSuccess }) =>
    onSuccess({
      outEntryPoint: "handler",
      inputFiles: [],
    })
  );
  lambdaState = new LambdaWatcherState({
    lambdaHandlers: [
      {
        srcPath: ".",
        handler: "lambda.main",
        runtime: "nodejs12.x",
        bundle: { nodeModules: [] },
      },
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
    "./lambda.main": {
      srcPath: ".",
      handler: "lambda.main",
      runtime: "nodejs12.x",
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
    "./lambda.go": {
      srcPath: ".",
      handler: "lambda.go",
      runtime: "go1.x",
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
    ".": {
      srcPath: ".",
      tsconfig: "tsconfig",
      inputFiles: ["a.js", "b.js"],
      lintProcess: "lint-process",
      needsReCheck: false,
      typeCheckProcess: "type-check-process",
    },
  });

  expect(Object.keys(lambdaState.state.watchedNodeFilesIndex)).toHaveLength(2);
  expect(lambdaState.state.watchedNodeFilesIndex).toMatchObject({
    "a.js": ["./lambda.main"],
    "b.js": ["./lambda.main"],
  });
});

test("build > inputFiles changed", async () => {
  let lambdaState;

  const onTranspileNode = jest.fn(({ esbuilder, onSuccess }) => {
    let data;
    // initial build
    if (!esbuilder) {
      data = {
        tsconfig: "tsconfig",
        esbuilder: "esbuild-process",
        outEntryPoint: "handler",
        inputFiles: ["lambda1.js", "lib.js"],
      };
    } else {
      data = {
        tsconfig: "tsconfig",
        esbuilder: "esbuild-process",
        outEntryPoint: "handler",
        inputFiles: ["lambda1.js", "lib2.js"],
      };
    }
    onSuccess(data);
  });
  const onRunLint = jest.fn(() => {
    () => {};
  });
  const onRunTypeCheck = jest.fn(() => {
    () => {};
  });
  const onAddWatchedFiles = jest.fn();
  const onRemoveWatchedFiles = jest.fn();
  lambdaState = new LambdaWatcherState({
    lambdaHandlers: [
      { srcPath: ".", handler: "lambda1.main", runtime: "nodejs12.x" },
    ],
    onTranspileNode,
    onRunLint,
    onRunTypeCheck,
    onAddWatchedFiles,
    onRemoveWatchedFiles,
  });
  await lambdaState.runInitialBuild();

  // Verify before file change
  expect(lambdaState.state.isProcessingLambdaChanges).toBeFalsy();
  expect(lambdaState.state.entryPointsData).toMatchObject({
    "./lambda1.main": {
      inputFiles: ["lambda1.js", "lib.js"],
    },
  });
  expect(lambdaState.state.srcPathsData).toMatchObject({
    ".": {
      inputFiles: ["lambda1.js", "lib.js"],
    },
  });
  expect(lambdaState.state.watchedNodeFilesIndex).toMatchObject({
    "lambda1.js": ["./lambda1.main"],
    "lib.js": ["./lambda1.main"],
  });

  // Change lambda1
  lambdaState.handleFileChange("lambda1.js");

  // Verify after file change
  expect(onAddWatchedFiles).toBeCalledWith(["lib2.js"]);
  expect(onRemoveWatchedFiles).toBeCalledWith(["lib.js"]);
  expect(lambdaState.state.isProcessingLambdaChanges).toBeTruthy();
  expect(lambdaState.state.entryPointsData).toMatchObject({
    "./lambda1.main": {
      inputFiles: ["lambda1.js", "lib2.js"],
    },
  });
  expect(lambdaState.state.srcPathsData).toMatchObject({
    ".": {
      inputFiles: ["lambda1.js", "lib2.js"],
    },
  });
  expect(lambdaState.state.watchedNodeFilesIndex).toMatchObject({
    "lambda1.js": ["./lambda1.main"],
    "lib2.js": ["./lambda1.main"],
  });
});

test("build > inputFiles removed but still used by another Lambda", async () => {
  // Test:
  // - two lambdas both have inputFiles "lib.js";
  // - lambda1 is changed and no longer has inputFiles "lib.js";
  // - srcPathsData should still have inputFiles "lib.js" b/c lambda2 still has it
  let lambdaState;

  const onTranspileNode = jest.fn(({ handler, esbuilder, onSuccess }) => {
    let data;
    // initial build
    if (!esbuilder) {
      data = {
        tsconfig: "tsconfig",
        esbuilder: "esbuild-process",
        outEntryPoint: "handler",
        inputFiles:
          handler === "lambda1.main"
            ? ["lambda1.js", "lib.js"]
            : ["lambda2.js", "lib.js"],
      };
    } else {
      data = {
        tsconfig: "tsconfig",
        esbuilder: "esbuild-process",
        outEntryPoint: "handler",
        inputFiles:
          handler === "lambda1.main"
            ? ["lambda1.js"]
            : ["lambda2.js", "lib.js"],
      };
    }
    return onSuccess(data);
  });
  const onRunLint = jest.fn(() => {
    () => {};
  });
  const onRunTypeCheck = jest.fn(() => {
    () => {};
  });
  const onAddWatchedFiles = jest.fn(() => "onAddWatchedFiles");
  const onRemoveWatchedFiles = jest.fn(() => "RemoveWatchedFiles");
  lambdaState = new LambdaWatcherState({
    lambdaHandlers: [
      { srcPath: ".", handler: "lambda1.main", runtime: "nodejs12.x" },
      { srcPath: ".", handler: "lambda2.main", runtime: "nodejs12.x" },
    ],
    onTranspileNode,
    onRunLint,
    onRunTypeCheck,
    onAddWatchedFiles,
    onRemoveWatchedFiles,
  });
  await lambdaState.runInitialBuild();

  // Verify before file change
  expect(lambdaState.state.isProcessingLambdaChanges).toBeFalsy();
  expect(lambdaState.state.entryPointsData).toMatchObject({
    "./lambda1.main": {
      inputFiles: ["lambda1.js", "lib.js"],
    },
    "./lambda2.main": {
      inputFiles: ["lambda2.js", "lib.js"],
    },
  });
  expect(lambdaState.state.srcPathsData).toMatchObject({
    ".": {
      inputFiles: ["lambda1.js", "lib.js", "lambda2.js"],
    },
  });
  expect(lambdaState.state.watchedNodeFilesIndex).toMatchObject({
    "lambda1.js": ["./lambda1.main"],
    "lambda2.js": ["./lambda2.main"],
    "lib.js": ["./lambda1.main", "./lambda2.main"],
  });

  // Change lambda1
  lambdaState.handleFileChange("lambda1.js");

  // Verify after file change
  expect(onAddWatchedFiles).toBeCalledWith([]);
  expect(onRemoveWatchedFiles).toBeCalledWith([]);
  expect(lambdaState.state.isProcessingLambdaChanges).toBeTruthy();
  expect(lambdaState.state.entryPointsData).toMatchObject({
    "./lambda1.main": {
      inputFiles: ["lambda1.js"],
    },
    "./lambda2.main": {
      inputFiles: ["lambda2.js", "lib.js"],
    },
  });
  expect(lambdaState.state.srcPathsData).toMatchObject({
    ".": {
      inputFiles: ["lambda1.js", "lambda2.js", "lib.js"],
    },
  });
  expect(lambdaState.state.watchedNodeFilesIndex).toMatchObject({
    "lambda1.js": ["./lambda1.main"],
    "lambda2.js": ["./lambda2.main"],
    "lib.js": ["./lambda2.main"],
  });
});

test("build > lambdaHandlers added", async () => {
  let lambdaState;

  const onTranspileNode = jest.fn(({ handler, onSuccess }) => {
    return onSuccess({
      tsconfig: "tsconfig",
      esbuilder: { rebuild: { dispose: () => {} } },
      outEntryPoint: "handler",
      inputFiles:
        handler === "lambda1.main"
          ? ["lambda1.js", "lib.js"]
          : ["lambda2.js", "lib.js"],
    });
  });
  const onRunLint = jest.fn(() => "lint-process");
  const onRunTypeCheck = jest.fn(() => "type-check-process");
  const onAddWatchedFiles = jest.fn();
  const onRemoveWatchedFiles = jest.fn();
  lambdaState = new LambdaWatcherState({
    lambdaHandlers: [
      { srcPath: ".", handler: "lambda1.main", runtime: "nodejs12.x" },
    ],
    onTranspileNode,
    onRunLint,
    onRunTypeCheck,
    onAddWatchedFiles,
    onRemoveWatchedFiles,
  });
  await lambdaState.runInitialBuild();

  // Verify before file change
  expect(lambdaState.state.isProcessingLambdaChanges).toBeFalsy();
  expect(lambdaState.state.entryPointsData).toMatchObject({
    "./lambda1.main": {
      inputFiles: ["lambda1.js", "lib.js"],
    },
  });
  expect(lambdaState.state.srcPathsData).toMatchObject({
    ".": {
      inputFiles: ["lambda1.js", "lib.js"],
    },
  });
  expect(lambdaState.state.watchedNodeFilesIndex).toMatchObject({
    "lambda1.js": ["./lambda1.main"],
    "lib.js": ["./lambda1.main"],
  });

  // Change lambda1
  lambdaState.handleUpdateLambdaHandlers([
    {
      srcPath: ".",
      handler: "lambda1.main",
      runtime: "nodejs14.x",
    },
    {
      srcPath: ".",
      handler: "lambda2.main",
      runtime: "nodejs14.x",
    },
  ]);

  // Verify after file change
  expect(onAddWatchedFiles).toBeCalledWith(["lambda2.js"]);
  expect(onRemoveWatchedFiles).toBeCalledTimes(0);
  expect(lambdaState.state.entryPointsData).toMatchObject({
    "./lambda1.main": {
      inputFiles: ["lambda1.js", "lib.js"],
    },
    "./lambda2.main": {
      inputFiles: ["lambda2.js", "lib.js"],
    },
  });
  expect(lambdaState.state.srcPathsData).toMatchObject({
    ".": {
      inputFiles: ["lambda1.js", "lib.js", "lambda2.js"],
    },
  });
  expect(lambdaState.state.watchedNodeFilesIndex).toMatchObject({
    "lambda1.js": ["./lambda1.main"],
    "lambda2.js": ["./lambda2.main"],
    "lib.js": ["./lambda1.main", "./lambda2.main"],
  });
});

test("build > lambdaHandlers removed", async () => {
  let lambdaState;

  const onTranspileNode = jest.fn(({ handler, onSuccess }) => {
    return onSuccess({
      tsconfig: "tsconfig",
      esbuilder: { rebuild: { dispose: () => {} } },
      outEntryPoint: "handler",
      inputFiles:
        handler === "lambda1.main"
          ? ["lambda1.js", "lib.js"]
          : ["lambda2.js", "lib.js"],
    });
  });
  const onRunLint = jest.fn(() => "lint-process");
  const onRunTypeCheck = jest.fn(() => "type-check-process");
  const onAddWatchedFiles = jest.fn();
  const onRemoveWatchedFiles = jest.fn();
  lambdaState = new LambdaWatcherState({
    lambdaHandlers: [
      { srcPath: ".", handler: "lambda1.main", runtime: "nodejs12.x" },
      { srcPath: ".", handler: "lambda2.main", runtime: "nodejs12.x" },
    ],
    onTranspileNode,
    onRunLint,
    onRunTypeCheck,
    onAddWatchedFiles,
    onRemoveWatchedFiles,
  });
  await lambdaState.runInitialBuild();

  // Verify before file change
  expect(lambdaState.state.isProcessingLambdaChanges).toBeFalsy();
  expect(lambdaState.state.entryPointsData).toMatchObject({
    "./lambda1.main": {
      inputFiles: ["lambda1.js", "lib.js"],
    },
    "./lambda2.main": {
      inputFiles: ["lambda2.js", "lib.js"],
    },
  });
  expect(lambdaState.state.srcPathsData).toMatchObject({
    ".": {
      inputFiles: ["lambda1.js", "lib.js", "lambda2.js"],
    },
  });
  expect(lambdaState.state.watchedNodeFilesIndex).toMatchObject({
    "lambda1.js": ["./lambda1.main"],
    "lambda2.js": ["./lambda2.main"],
    "lib.js": ["./lambda1.main", "./lambda2.main"],
  });

  // Change lambda1
  lambdaState.handleUpdateLambdaHandlers([
    { srcPath: ".", handler: "lambda1.main", runtime: "nodejs12.x" },
  ]);

  // Verify after file change
  expect(onAddWatchedFiles).toBeCalledTimes(0);
  expect(onRemoveWatchedFiles).toBeCalledWith(["lambda2.js"]);
  expect(lambdaState.state.entryPointsData).toMatchObject({
    "./lambda1.main": {
      inputFiles: ["lambda1.js", "lib.js"],
    },
  });
  expect(lambdaState.state.entryPointsData).not.toMatchObject({
    "./lambda2.main": expect.anything(),
  });
  expect(lambdaState.state.srcPathsData).toMatchObject({
    ".": {
      inputFiles: ["lambda1.js", "lib.js"],
    },
  });
  expect(lambdaState.state.watchedNodeFilesIndex).toMatchObject({
    "lambda1.js": ["./lambda1.main"],
    "lib.js": ["./lambda1.main"],
  });
  expect(lambdaState.state.watchedNodeFilesIndex).not.toMatchObject({
    "lambda2.js": expect.anything(),
  });
});

test("build > lambdaHandlers added Go", async () => {
  let lambdaState;

  const onTranspileNode = jest.fn(({ onSuccess }) => {
    return onSuccess({
      tsconfig: "tsconfig",
      esbuilder: { rebuild: { dispose: () => {} } },
      outEntryPoint: "handler",
      inputFiles: ["lambda1.js", "lib.js"],
    });
  });
  const onRunLint = jest.fn(() => "lint-process");
  const onRunTypeCheck = jest.fn(() => "type-check-process");
  const onCompileGo = jest.fn(({ onSuccess }) =>
    onSuccess({
      outEntryPoint: "handler",
      inputFiles: [],
    })
  );
  const onAddWatchedFiles = jest.fn();
  const onRemoveWatchedFiles = jest.fn();
  lambdaState = new LambdaWatcherState({
    lambdaHandlers: [
      { srcPath: ".", handler: "lambda1.main", runtime: "nodejs12.x" },
    ],
    onTranspileNode,
    onRunLint,
    onRunTypeCheck,
    onCompileGo,
    onAddWatchedFiles,
    onRemoveWatchedFiles,
  });
  await lambdaState.runInitialBuild();

  // Verify before file change
  expect(lambdaState.state.isProcessingLambdaChanges).toBeFalsy();
  expect(lambdaState.state.entryPointsData).toMatchObject({
    "./lambda1.main": {
      inputFiles: ["lambda1.js", "lib.js"],
    },
  });
  expect(lambdaState.state.srcPathsData).toMatchObject({
    ".": {
      inputFiles: ["lambda1.js", "lib.js"],
    },
  });
  expect(lambdaState.state.watchedNodeFilesIndex).toMatchObject({
    "lambda1.js": ["./lambda1.main"],
    "lib.js": ["./lambda1.main"],
  });

  // Change lambda1
  lambdaState.handleUpdateLambdaHandlers([
    {
      srcPath: ".",
      handler: "lambda1.main",
      runtime: "nodejs14.x",
    },
    {
      srcPath: ".",
      handler: "lambda2.main",
      runtime: "go1.x",
    },
  ]);

  // Verify after file change
  expect(onAddWatchedFiles).toBeCalledWith(["**/*.go"]);
  expect(onRemoveWatchedFiles).toBeCalledTimes(0);
  expect(lambdaState.state.entryPointsData).toMatchObject({
    "./lambda1.main": {
      inputFiles: ["lambda1.js", "lib.js"],
    },
    "./lambda2.main": {
      inputFiles: [],
    },
  });
  expect(lambdaState.state.srcPathsData).toMatchObject({
    ".": {
      inputFiles: ["lambda1.js", "lib.js"],
    },
  });
  expect(lambdaState.state.watchedNodeFilesIndex).toMatchObject({
    "lambda1.js": ["./lambda1.main"],
    "lib.js": ["./lambda1.main"],
  });
});

test("build > lambdaHandlers removed Go", async () => {
  let lambdaState;

  const onTranspileNode = jest.fn(({ onSuccess }) => {
    return onSuccess({
      tsconfig: "tsconfig",
      esbuilder: { rebuild: { dispose: () => {} } },
      outEntryPoint: "handler",
      inputFiles: ["lambda1.js", "lib.js"],
    });
  });
  const onRunLint = jest.fn(() => "lint-process");
  const onRunTypeCheck = jest.fn(() => "type-check-process");
  const onCompileGo = jest.fn(({ onSuccess }) =>
    onSuccess({
      outEntryPoint: "handler",
      inputFiles: [],
    })
  );
  const onAddWatchedFiles = jest.fn();
  const onRemoveWatchedFiles = jest.fn();
  lambdaState = new LambdaWatcherState({
    lambdaHandlers: [
      { srcPath: ".", handler: "lambda1.main", runtime: "nodejs12.x" },
      { srcPath: ".", handler: "lambda2.main", runtime: "go1.x" },
    ],
    onTranspileNode,
    onRunLint,
    onRunTypeCheck,
    onCompileGo,
    onAddWatchedFiles,
    onRemoveWatchedFiles,
  });
  await lambdaState.runInitialBuild();

  // Verify before file change
  expect(lambdaState.state.isProcessingLambdaChanges).toBeFalsy();
  expect(lambdaState.state.entryPointsData).toMatchObject({
    "./lambda1.main": {
      inputFiles: ["lambda1.js", "lib.js"],
    },
    "./lambda2.main": {
      inputFiles: [],
    },
  });
  expect(lambdaState.state.srcPathsData).toMatchObject({
    ".": {
      inputFiles: ["lambda1.js", "lib.js"],
    },
  });
  expect(lambdaState.state.watchedNodeFilesIndex).toMatchObject({
    "lambda1.js": ["./lambda1.main"],
    "lib.js": ["./lambda1.main"],
  });

  // Change lambda1
  lambdaState.handleUpdateLambdaHandlers([
    {
      srcPath: ".",
      handler: "lambda1.main",
      runtime: "nodejs14.x",
    },
  ]);

  // Verify after file change
  expect(onAddWatchedFiles).toBeCalledTimes(0);
  expect(onRemoveWatchedFiles).toBeCalledWith(["**/*.go"]);
  expect(lambdaState.state.entryPointsData).toMatchObject({
    "./lambda1.main": {
      inputFiles: ["lambda1.js", "lib.js"],
    },
  });
  expect(lambdaState.state.srcPathsData).toMatchObject({
    ".": {
      inputFiles: ["lambda1.js", "lib.js"],
    },
  });
  expect(lambdaState.state.watchedNodeFilesIndex).toMatchObject({
    "lambda1.js": ["./lambda1.main"],
    "lib.js": ["./lambda1.main"],
  });
});

test("build > lambdaHandlers added not exist > getTranspiledHandler", async () => {
  let lambdaState;

  const onTranspileNode = jest.fn(({ handler, onSuccess, onFailure }) => {
    if (handler === "lambda1.main") {
      onSuccess({
        tsconfig: "tsconfig",
        esbuilder: "esbuild-process",
        outEntryPoint: "handler",
        inputFiles: ["lambda1.js", "lib.js"],
      });
    } else {
      onFailure(new Error("failed"));
    }
  });
  const onRunLint = jest.fn(() => {
    () => {};
  });
  const onRunTypeCheck = jest.fn(() => {
    () => {};
  });
  const onAddWatchedFiles = jest.fn();
  const onRemoveWatchedFiles = jest.fn();
  lambdaState = new LambdaWatcherState({
    lambdaHandlers: [
      { srcPath: ".", handler: "lambda1.main", runtime: "nodejs12.x" },
    ],
    onTranspileNode,
    onRunLint,
    onRunTypeCheck,
    onAddWatchedFiles,
    onRemoveWatchedFiles,
  });
  await lambdaState.runInitialBuild();
  // Update Lambda handlers
  lambdaState.handleUpdateLambdaHandlers([
    {
      srcPath: ".",
      handler: "lambda1.main",
      runtime: "nodejs14.x",
    },
    {
      srcPath: ".",
      handler: "lambda2.main",
      runtime: "nodejs14.x",
    },
  ]);
  // Get transpiled handler
  await expect(
    lambdaState.getTranspiledHandler(".", "lambda2.main")
  ).rejects.toThrow(/Failed to build the Lambda handler for "lambda2.main"/);

  // Verify after file change
  expect(lambdaState.state.isProcessingLambdaChanges).toBeFalsy();
  expect(lambdaState.state.entryPointsData).toMatchObject({
    "./lambda1.main": {
      inputFiles: ["lambda1.js", "lib.js"],
    },
    "./lambda2.main": {
      inputFiles: [],
      pendingRequestCallbacks: [],
    },
  });
  expect(lambdaState.state.srcPathsData).toMatchObject({
    ".": {
      inputFiles: ["lambda1.js", "lib.js"],
    },
  });
  expect(lambdaState.state.watchedNodeFilesIndex).toMatchObject({
    "lambda1.js": ["./lambda1.main"],
    "lib.js": ["./lambda1.main"],
  });
});
