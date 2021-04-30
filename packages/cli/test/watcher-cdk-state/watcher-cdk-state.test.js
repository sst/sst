const WatcherCdkState = require("../../scripts/util/WatcherCdkState");

test("getInputFiles", async () => {
  const cdkState = new WatcherCdkState({
    inputFiles: ["a.js", "b.js"],
  });
  expect(cdkState.getInputFiles()).toEqual(["a.js", "b.js"]);
});

test("idle > onFileChange (file not exist)", async () => {
  const runReBuild = jest.fn(() => "rebuild-process");
  const cdkState = new WatcherCdkState({
    inputFiles: ["a.js", "b.js"],
    runReBuild,
  });
  expect(cdkState.state).toMatchObject({
    buildPromise: null,
  });

  cdkState.onFileChange("c.js");

  expect(runReBuild).toBeCalledTimes(0);
  expect(cdkState.state).toMatchObject({
    buildPromise: null,
  });
});

test("idle > onFileChange", async () => {
  const runReBuild = jest.fn(() => "rebuild-process");
  const cdkState = new WatcherCdkState({
    inputFiles: ["a.js", "b.js"],
    runReBuild,
  });
  expect(cdkState.state).toMatchObject({
    buildPromise: null,
  });

  cdkState.onFileChange("a.js");

  expect(runReBuild).toBeCalledTimes(1);
  expect(cdkState.state).toMatchObject({
    buildPromise: "rebuild-process",
    needsReBuild: false,
    hasBuildError: false,
  });
});

test("idle > onFileChange > onFileChange", async () => {
  const runReBuild = jest.fn(() => "rebuild-process");
  const cdkState = new WatcherCdkState({
    inputFiles: ["a.js", "b.js"],
    runReBuild,
  });
  expect(cdkState.state).toMatchObject({
    buildPromise: null,
  });

  cdkState.onFileChange("a.js");
  cdkState.onFileChange("b.js");

  expect(runReBuild).toBeCalledTimes(1);
  expect(cdkState.state).toMatchObject({
    buildPromise: "rebuild-process",
    needsReBuild: true,
    hasBuildError: false,
  });
});

test("idle > onFileChange > build succeeded", async () => {
  const runReBuild = jest.fn(() => "rebuild");
  const runLint = jest.fn(() => "lint");
  const runTypeCheck = jest.fn(() => "type-check");
  const runSynth = jest.fn(() => "synth");
  const runReDeploy = jest.fn(() => "redeploy");
  const updateWatchedFiles = jest.fn(() => "redeploy");

  const cdkState = new WatcherCdkState({
    inputFiles: ["a.js", "b.js"],
    runReBuild,
    runLint,
    runTypeCheck,
    runSynth,
    runReDeploy,
    updateWatchedFiles,
  });

  cdkState.onFileChange("a.js");
  cdkState.onReBuildSucceeded({ inputFiles: ["a.js", "b.js"] });

  expect(runReBuild).toBeCalledTimes(1);
  expect(runLint).toBeCalledTimes(1);
  expect(runTypeCheck).toBeCalledTimes(1);
  expect(runSynth).toBeCalledTimes(1);
  expect(runReDeploy).toBeCalledTimes(0);
  expect(updateWatchedFiles).toBeCalledTimes(1);
  expect(updateWatchedFiles).toBeCalledWith([], []);
  expect(cdkState.state).toMatchObject({
    inputFiles: ["a.js", "b.js"],
    // build
    buildPromise: null,
    needsReBuild: false,
    hasBuildError: false,
    // checks & synth
    needsReCheck: false,
    lintProcess: "lint",
    typeCheckProcess: "type-check",
    synthPromise: "synth",
    hasLintError: false,
    hasTypeCheckError: false,
    hasSynthError: false,
  });
});

test("idle > onFileChange > build succeeded (inputFiles changed)", async () => {
  const runReBuild = jest.fn(() => "rebuild");
  const runLint = jest.fn(() => "lint");
  const runTypeCheck = jest.fn(() => "type-check");
  const runSynth = jest.fn(() => "synth");
  const runReDeploy = jest.fn(() => "redeploy");
  const updateWatchedFiles = jest.fn(() => "redeploy");

  const cdkState = new WatcherCdkState({
    inputFiles: ["a.js", "b.js"],
    runReBuild,
    runLint,
    runTypeCheck,
    runSynth,
    runReDeploy,
    updateWatchedFiles,
  });

  cdkState.onFileChange("a.js");
  cdkState.onReBuildSucceeded({ inputFiles: ["a.js", "c.js"] });

  expect(runReBuild).toBeCalledTimes(2);
  expect(runLint).toBeCalledTimes(0);
  expect(runTypeCheck).toBeCalledTimes(0);
  expect(runSynth).toBeCalledTimes(0);
  expect(runReDeploy).toBeCalledTimes(0);
  expect(updateWatchedFiles).toBeCalledTimes(1);
  expect(updateWatchedFiles).toBeCalledWith(["c.js"], ["b.js"]);
  expect(cdkState.state).toMatchObject({
    inputFiles: ["a.js", "c.js"],
    // build
    buildPromise: "rebuild",
    needsReBuild: false,
    hasBuildError: false,
  });

  // rebuild called again b/c new files introduced
  cdkState.onReBuildSucceeded({ inputFiles: ["a.js", "c.js"] });

  expect(runReBuild).toBeCalledTimes(2);
  expect(runLint).toBeCalledTimes(1);
  expect(runTypeCheck).toBeCalledTimes(1);
  expect(runSynth).toBeCalledTimes(1);
  expect(runReDeploy).toBeCalledTimes(0);
  expect(updateWatchedFiles).toBeCalledTimes(2);
  expect(updateWatchedFiles).toBeCalledWith([], []);
  expect(cdkState.state).toMatchObject({
    inputFiles: ["a.js", "c.js"],
    // build
    buildPromise: null,
    needsReBuild: false,
    hasBuildError: false,
    // checks & synth
    needsReCheck: false,
    lintProcess: "lint",
    typeCheckProcess: "type-check",
    synthPromise: "synth",
    hasLintError: false,
    hasTypeCheckError: false,
    hasSynthError: false,
  });
});

test("idle > onFileChange > build succeeded > deploy", async () => {
  const runReBuild = jest.fn(() => "rebuild");
  const runLint = jest.fn(() => "lint");
  const runTypeCheck = jest.fn(() => "type-check");
  const runSynth = jest.fn(() => "synth");
  const runReDeploy = jest.fn(() => "redeploy");
  const updateWatchedFiles = jest.fn(() => "redeploy");

  const cdkState = new WatcherCdkState({
    inputFiles: ["a.js", "b.js"],
    runReBuild,
    runLint,
    runTypeCheck,
    runSynth,
    runReDeploy,
    updateWatchedFiles,
  });

  cdkState.onFileChange("a.js");
  cdkState.onReBuildSucceeded({ inputFiles: ["a.js", "b.js"] });
  cdkState.onLintDone({ cp: "lint", code: 0 });
  cdkState.onTypeCheckDone({ cp: "type-check", code: 0 });
  cdkState.onSynthDone({ hasError: false });

  expect(runReBuild).toBeCalledTimes(1);
  expect(runLint).toBeCalledTimes(1);
  expect(runTypeCheck).toBeCalledTimes(1);
  expect(runSynth).toBeCalledTimes(1);
  expect(runReDeploy).toBeCalledTimes(0);
  expect(updateWatchedFiles).toBeCalledTimes(1);
  expect(cdkState.state).toMatchObject({
    inputFiles: ["a.js", "b.js"],
    // build
    buildPromise: null,
    needsReBuild: false,
    hasBuildError: false,
    // checks & synth
    needsReCheck: false,
    lintProcess: null,
    typeCheckProcess: null,
    synthPromise: null,
    hasLintError: false,
    hasTypeCheckError: false,
    hasSynthError: false,
    // deploy
    needsReDeploy: true,
    userWillReDeploy: false,
    deployPromise: null,
  });

  // User hits ENTER
  cdkState.onInput();

  expect(runReDeploy).toBeCalledTimes(1);
  expect(cdkState.state).toMatchObject({
    // deploy
    needsReDeploy: false,
    userWillReDeploy: false,
    deployPromise: "redeploy",
  });
});

test("idle > onFileChange > build failed", async () => {
  const runReBuild = jest.fn(() => "rebuild");
  const runLint = jest.fn(() => "lint");
  const runTypeCheck = jest.fn(() => "type-check");
  const runSynth = jest.fn(() => "synth");
  const runReDeploy = jest.fn(() => "redeploy");
  const updateWatchedFiles = jest.fn(() => "redeploy");

  const cdkState = new WatcherCdkState({
    inputFiles: ["a.js", "b.js"],
    runReBuild,
    runLint,
    runTypeCheck,
    runSynth,
    runReDeploy,
    updateWatchedFiles,
  });

  cdkState.onFileChange("a.js");
  cdkState.onReBuildSucceeded({ inputFiles: ["a.js", "b.js"] });
  cdkState.onLintDone({ cp: "lint", code: 0 });
  cdkState.onTypeCheckDone({ cp: "type-check", code: 0 });
  cdkState.onSynthDone({ hasError: true });

  expect(runReBuild).toBeCalledTimes(1);
  expect(runLint).toBeCalledTimes(1);
  expect(runTypeCheck).toBeCalledTimes(1);
  expect(runSynth).toBeCalledTimes(1);
  expect(runReDeploy).toBeCalledTimes(0);
  expect(updateWatchedFiles).toBeCalledTimes(1);
  expect(cdkState.state).toMatchObject({
    inputFiles: ["a.js", "b.js"],
    // build
    buildPromise: null,
    needsReBuild: false,
    hasBuildError: false,
    // checks & synth
    needsReCheck: false,
    lintProcess: null,
    typeCheckProcess: null,
    synthPromise: null,
    hasLintError: false,
    hasTypeCheckError: false,
    hasSynthError: true,
    // deploy
    needsReDeploy: false,
    userWillReDeploy: false,
    deployPromise: null,
  });
});

test("idle > deploy (nothing to deploy)", async () => {
  const runReDeploy = jest.fn(() => "redeploy");

  const cdkState = new WatcherCdkState({
    inputFiles: ["a.js", "b.js"],
    runReDeploy,
  });

  // User hits ENTER
  cdkState.onInput();

  expect(runReDeploy).toBeCalledTimes(0);
  expect(cdkState.state).toMatchObject({
    // build
    buildPromise: null,
    needsReBuild: false,
    hasBuildError: false,
    // deploy
    needsReDeploy: false,
    userWillReDeploy: false,
    deployPromise: null,
  });
});

