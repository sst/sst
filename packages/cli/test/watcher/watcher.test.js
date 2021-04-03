const path = require("path");
const fs = require("fs-extra");
const Watcher = require("../../scripts/util/Watcher");
const { clearBuildOutput } = require("../helpers");
const paths = require("../../scripts/util/paths");

let watcher;

beforeEach(async () => {
  const buildDir = path.join(__dirname, paths.appBuildDir);
  fs.emptyDirSync(buildDir);

  // start watcher
  watcher = new Watcher({
    appPath,
    lambdaHandlers: [
      { srcPath: ".", handler: "lambda.main", runtime: "nodejs12.x" },
      { srcPath: ".", handler: "lambda.go", runtime: "go1.x" },
    ],
    isLintEnabled: true,
    isTypeCheckEnabled: true,
    cdkInputFiles: [ "lib/index.js" ],
  });
});

afterEach(async () => {
  // stop watcher
  watcher.stop();
});

afterAll(async () => {
  await clearBuildOutput(__dirname);
});

const appPath = path.resolve(__dirname);

test("watcher", async () => {
  await watcher.start();

  // Verify build output
  const buildPath = path.join(__dirname, paths.appBuildDir);
  const buildFiles = fs.readdirSync(buildPath);
  expect(buildFiles).toHaveLength(4);
  expect(buildFiles).toEqual(
    expect.arrayContaining([
      // Go binary
      'lambda',
      // NodeJS output
      'lambda.js', 'lambda.js.map'
    ])
  );

  // Verify state
  const state = watcher.getState();
  expect(state.isBusy).toBeFalsy();

  expect(state.entryPointsData).toEqual({
    './lambda.main': {
      srcPath: '.',
      handler: 'lambda.main',
      runtime: 'nodejs12.x',
      hasError: false,
      buildPromise: null,
      inputFiles: [
        // ie. "/Users/frank/Sites/serverless-stack/packages/cli/test/watcher/lambda.js"
        expect.stringContaining("lambda.js"),
      ],
      needsReBuild: 0,
      outEntryPoint: {
        entry: "lambda.js",
          handler: "main",
          origHandlerFullPosixPath: "./lambda.main",
          srcPath: ".build",
      },
      pendingRequestCallbacks: [],
      tsconfig: undefined,
      esbuilder: expect.anything(),
    },
    './lambda.go': {
      srcPath: '.',
      handler: 'lambda.go',
      runtime: 'go1.x',
      hasError: false,
      buildPromise: null,
      outEntryPoint: {
        // ie. "/Users/frank/Sites/serverless-stack/packages/cli/test/watcher/.build/lambda"
        entry: expect.stringContaining("lambda"),
        origHandlerFullPosixPath: "./lambda.go",
      },
      needsReBuild: 0,
      pendingRequestCallbacks: [],
      tsconfig: undefined,
      esbuilder: undefined,
      inputFiles: []
    }
  });

  expect(state.srcPathsData).toEqual({
    '.': {
      srcPath: '.',
      tsconfig: undefined,
      inputFiles: [],
      lintProcess: null,
      needsReCheck: false,
      typeCheckProcess: null
    }
  });

  expect(Object.keys(state.watchedNodeFilesIndex)).toHaveLength(1);
  // ie. "/Users/frank/Sites/serverless-stack/packages/cli/test/watcher/lambda.js"
  expect(Object.keys(state.watchedNodeFilesIndex)[0].endsWith("lambda.js")).toBeTruthy();
  expect(Object.values(state.watchedNodeFilesIndex)[0]).toEqual(expect.arrayContaining(["./lambda.main"]));

  expect(state.watchedCdkFilesIndex).toEqual({
    'lib/index.js': true
  });
});
