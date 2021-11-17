const CdkWatcherState = require("../../scripts/util/CdkWatcherState");

test("getWatchedFiles", async () => {
  const cdkState = new CdkWatcherState({
    inputFiles: ["a.js", "b.js"],
  });
  expect(cdkState.getWatchedFiles()).toEqual(["a.js", "b.js"]);
});

test("idle > handleFileChange (file not exist)", async () => {
  const onReBuild = jest.fn(() => "rebuild-process");
  const cdkState = new CdkWatcherState({
    inputFiles: ["a.js", "b.js"],
    onReBuild,
  });
  expect(cdkState.state).toMatchObject({
    buildPromise: null,
  });

  cdkState.handleFileChange("c.js");

  expect(onReBuild).toBeCalledTimes(0);
  expect(cdkState.state).toMatchObject({
    buildPromise: null,
  });
});

test("idle > handleFileChange", async () => {
  const onReBuild = jest.fn(() => "rebuild-process");
  const cdkState = new CdkWatcherState({
    inputFiles: ["a.js", "b.js"],
    onReBuild,
    onStatusUpdated: jest.fn(),
  });
  expect(cdkState.state).toMatchObject({
    buildPromise: null,
  });

  cdkState.handleFileChange("a.js");

  expect(onReBuild).toBeCalledTimes(1);
  expect(cdkState.state).toMatchObject({
    buildPromise: "rebuild-process",
    needsReBuild: false,
    buildErrors: null,
  });
});

test("idle > handleFileChange > handleFileChange", async () => {
  const onReBuild = jest.fn(() => "rebuild-process");
  const cdkState = new CdkWatcherState({
    inputFiles: ["a.js", "b.js"],
    onReBuild,
    onStatusUpdated: jest.fn(),
  });
  expect(cdkState.state).toMatchObject({
    buildPromise: null,
  });

  cdkState.handleFileChange("a.js");
  cdkState.handleFileChange("b.js");

  expect(onReBuild).toBeCalledTimes(1);
  expect(cdkState.state).toMatchObject({
    buildPromise: "rebuild-process",
    needsReBuild: true,
    buildErrors: null,
  });
});

test("idle > handleFileChange > build succeeded", async () => {
  const onReBuild = jest.fn(() => "rebuild");
  const onLint = jest.fn(() => "lint");
  const onTypeCheck = jest.fn(() => "type-check");
  const onSynth = jest.fn(() => "synth");
  const onReDeploy = jest.fn(() => "redeploy");
  const onAddWatchedFiles = jest.fn(() => "onAddWatchedFiles");
  const onRemoveWatchedFiles = jest.fn(() => "RemoveWatchedFiles");

  const cdkState = new CdkWatcherState({
    inputFiles: ["a.js", "b.js"],
    onReBuild,
    onLint,
    onTypeCheck,
    onSynth,
    onReDeploy,
    onAddWatchedFiles,
    onRemoveWatchedFiles,
    onStatusUpdated: jest.fn(),
  });

  cdkState.handleFileChange("a.js");
  cdkState.handleReBuildSucceeded({ inputFiles: ["a.js", "b.js"] });

  expect(onReBuild).toBeCalledTimes(1);
  expect(onLint).toBeCalledTimes(1);
  expect(onTypeCheck).toBeCalledTimes(1);
  expect(onSynth).toBeCalledTimes(1);
  expect(onReDeploy).toBeCalledTimes(0);
  expect(onAddWatchedFiles).toBeCalledTimes(1);
  expect(onAddWatchedFiles).toBeCalledWith([]);
  expect(onRemoveWatchedFiles).toBeCalledTimes(1);
  expect(onRemoveWatchedFiles).toBeCalledWith([]);
  expect(cdkState.state).toMatchObject({
    inputFiles: ["a.js", "b.js"],
    // build
    buildPromise: null,
    needsReBuild: false,
    buildErrors: null,
    // checks & synth
    needsReCheck: false,
    lintProcess: "lint",
    lintHasError: null,
    typeCheckProcess: "type-check",
    typeCheckErrorOutput: null,
    synthPromise: "synth",
    synthError: null,
  });
});

test("idle > handleFileChange > build succeeded (inputFiles changed)", async () => {
  const onReBuild = jest.fn(() => "rebuild");
  const onLint = jest.fn(() => "lint");
  const onTypeCheck = jest.fn(() => "type-check");
  const onSynth = jest.fn(() => "synth");
  const onReDeploy = jest.fn(() => "redeploy");
  const onAddWatchedFiles = jest.fn(() => "onAddWatchedFiles");
  const onRemoveWatchedFiles = jest.fn(() => "RemoveWatchedFiles");

  const cdkState = new CdkWatcherState({
    inputFiles: ["a.js", "b.js"],
    onReBuild,
    onLint,
    onTypeCheck,
    onSynth,
    onReDeploy,
    onAddWatchedFiles,
    onRemoveWatchedFiles,
    onStatusUpdated: jest.fn(),
  });

  cdkState.handleFileChange("a.js");
  cdkState.handleReBuildSucceeded({ inputFiles: ["a.js", "c.js"] });

  expect(onReBuild).toBeCalledTimes(2);
  expect(onLint).toBeCalledTimes(0);
  expect(onTypeCheck).toBeCalledTimes(0);
  expect(onSynth).toBeCalledTimes(0);
  expect(onReDeploy).toBeCalledTimes(0);
  expect(onAddWatchedFiles).toBeCalledTimes(1);
  expect(onAddWatchedFiles).toBeCalledWith(["c.js"]);
  expect(onRemoveWatchedFiles).toBeCalledTimes(1);
  expect(onRemoveWatchedFiles).toBeCalledWith(["b.js"]);
  expect(cdkState.state).toMatchObject({
    inputFiles: ["a.js", "c.js"],
    // build
    buildPromise: "rebuild",
    needsReBuild: false,
    buildErrors: null,
  });

  // rebuild called again b/c new files introduced
  cdkState.handleReBuildSucceeded({ inputFiles: ["a.js", "c.js"] });

  expect(onReBuild).toBeCalledTimes(2);
  expect(onLint).toBeCalledTimes(1);
  expect(onTypeCheck).toBeCalledTimes(1);
  expect(onSynth).toBeCalledTimes(1);
  expect(onReDeploy).toBeCalledTimes(0);
  expect(onAddWatchedFiles).toBeCalledTimes(2);
  expect(onAddWatchedFiles).toBeCalledWith([]);
  expect(onRemoveWatchedFiles).toBeCalledTimes(2);
  expect(onRemoveWatchedFiles).toBeCalledWith([]);
  expect(cdkState.state).toMatchObject({
    inputFiles: ["a.js", "c.js"],
    // build
    buildPromise: null,
    needsReBuild: false,
    buildErrors: null,
    // checks & synth
    needsReCheck: false,
    lintProcess: "lint",
    lintHasError: null,
    typeCheckProcess: "type-check",
    typeCheckErrorOutput: null,
    synthPromise: "synth",
    synthError: null,
  });
});

test("idle > handleFileChange > build succeeded > synth succeeded > deploy success", async () => {
  const onReBuild = jest.fn(() => "rebuild");
  const onLint = jest.fn(() => "lint");
  const onTypeCheck = jest.fn(() => "type-check");
  const onSynth = jest.fn(() => "synth");
  const onReDeploy = jest.fn(() => "redeploy");
  const onAddWatchedFiles = jest.fn(() => "onAddWatchedFiles");
  const onRemoveWatchedFiles = jest.fn(() => "RemoveWatchedFiles");

  const cdkState = new CdkWatcherState({
    inputFiles: ["a.js", "b.js"],
    initialChecksumData: { stackA: "abc" },
    onReBuild,
    onLint,
    onTypeCheck,
    onSynth,
    onReDeploy,
    onAddWatchedFiles,
    onRemoveWatchedFiles,
    onStatusUpdated: jest.fn(),
  });

  cdkState.handleFileChange("a.js");
  cdkState.handleReBuildSucceeded({ inputFiles: ["a.js", "b.js"] });
  cdkState.handleLintDone({ cp: "lint", code: 0 });
  cdkState.handleTypeCheckDone({ cp: "type-check", code: 0 });
  cdkState.handleSynthDone({
    error: null,
    checksumData: { stackA: "bcd" },
  });

  expect(onReBuild).toBeCalledTimes(1);
  expect(onLint).toBeCalledTimes(1);
  expect(onTypeCheck).toBeCalledTimes(1);
  expect(onSynth).toBeCalledTimes(1);
  expect(onReDeploy).toBeCalledTimes(0);
  expect(onAddWatchedFiles).toBeCalledTimes(1);
  expect(onRemoveWatchedFiles).toBeCalledTimes(1);
  expect(cdkState.state).toMatchObject({
    inputFiles: ["a.js", "b.js"],
    // build
    buildPromise: null,
    needsReBuild: false,
    buildErrors: null,
    // checks & synth
    needsReCheck: false,
    lintProcess: null,
    lintHasError: null,
    typeCheckProcess: null,
    typeCheckErrorOutput: null,
    synthPromise: null,
    synthError: null,
    synthedChecksumData: { stackA: "bcd" },
    lastDeployingChecksumData: { stackA: "abc" },
    // deploy
    needsReDeploy: true,
    userWillReDeploy: false,
    deployPromise: null,
  });

  // User hits ENTER
  cdkState.handleDeploy();

  expect(onReDeploy).toBeCalledTimes(1);
  expect(cdkState.state).toMatchObject({
    // checks & synth
    synthedChecksumData: { stackA: "bcd" },
    lastDeployingChecksumData: { stackA: "bcd" },
    // deploy
    needsReDeploy: false,
    userWillReDeploy: false,
    deployPromise: "redeploy",
  });

  // Deploy succeeded
  cdkState.handleReDeployDone({ error: null });

  expect(cdkState.state).toMatchObject({
    needsReDeploy: false,
    userWillReDeploy: false,
    deployPromise: null,
  });
});

test("idle > handleFileChange > build succeeded > synth succeeded > deploy failed", async () => {
  const onReBuild = jest.fn(() => "rebuild");
  const onLint = jest.fn(() => "lint");
  const onTypeCheck = jest.fn(() => "type-check");
  const onSynth = jest.fn(() => "synth");
  const onReDeploy = jest.fn(() => "redeploy");
  const onAddWatchedFiles = jest.fn(() => "onAddWatchedFiles");
  const onRemoveWatchedFiles = jest.fn(() => "RemoveWatchedFiles");

  const cdkState = new CdkWatcherState({
    inputFiles: ["a.js", "b.js"],
    initialChecksumData: { stackA: "abc" },
    onReBuild,
    onLint,
    onTypeCheck,
    onSynth,
    onReDeploy,
    onAddWatchedFiles,
    onRemoveWatchedFiles,
    onStatusUpdated: jest.fn(),
  });

  cdkState.handleFileChange("a.js");
  cdkState.handleReBuildSucceeded({ inputFiles: ["a.js", "b.js"] });
  cdkState.handleLintDone({ cp: "lint", code: 0 });
  cdkState.handleTypeCheckDone({ cp: "type-check", code: 0 });
  cdkState.handleSynthDone({
    error: null,
    checksumData: { stackA: "bcd" },
  });

  expect(cdkState.state).toMatchObject({
    needsReDeploy: true,
    userWillReDeploy: false,
    deployPromise: null,
  });

  // User hits ENTER
  cdkState.handleDeploy();

  expect(onReDeploy).toBeCalledTimes(1);
  expect(cdkState.state).toMatchObject({
    needsReDeploy: false,
    userWillReDeploy: false,
    deployPromise: "redeploy",
  });

  // Deploy failed
  cdkState.handleReDeployDone({ error: new Error() });

  expect(cdkState.state).toMatchObject({
    needsReDeploy: true,
    userWillReDeploy: false,
    deployPromise: null,
  });
});

test("idle > handleFileChange > build succeeded > synth succeeded > deploy (no changes)", async () => {
  const onReBuild = jest.fn(() => "rebuild");
  const onLint = jest.fn(() => "lint");
  const onTypeCheck = jest.fn(() => "type-check");
  const onSynth = jest.fn(() => "synth");
  const onReDeploy = jest.fn(() => "redeploy");
  const onAddWatchedFiles = jest.fn(() => "onAddWatchedFiles");
  const onRemoveWatchedFiles = jest.fn(() => "RemoveWatchedFiles");

  const cdkState = new CdkWatcherState({
    inputFiles: ["a.js", "b.js"],
    initialChecksumData: { stackA: "abc" },
    onReBuild,
    onLint,
    onTypeCheck,
    onSynth,
    onReDeploy,
    onAddWatchedFiles,
    onRemoveWatchedFiles,
    onStatusUpdated: jest.fn(),
  });

  cdkState.handleFileChange("a.js");
  cdkState.handleReBuildSucceeded({ inputFiles: ["a.js", "b.js"] });
  cdkState.handleLintDone({ cp: "lint", code: 0 });
  cdkState.handleTypeCheckDone({ cp: "type-check", code: 0 });
  cdkState.handleSynthDone({
    error: null,
    checksumData: { stackA: "abc" },
  });

  expect(onReBuild).toBeCalledTimes(1);
  expect(onLint).toBeCalledTimes(1);
  expect(onTypeCheck).toBeCalledTimes(1);
  expect(onSynth).toBeCalledTimes(1);
  expect(onReDeploy).toBeCalledTimes(0);
  expect(onAddWatchedFiles).toBeCalledTimes(1);
  expect(onRemoveWatchedFiles).toBeCalledTimes(1);
  expect(cdkState.state).toMatchObject({
    inputFiles: ["a.js", "b.js"],
    // build
    buildPromise: null,
    needsReBuild: false,
    buildErrors: null,
    // checks & synth
    needsReCheck: false,
    lintProcess: null,
    lintHasError: null,
    typeCheckProcess: null,
    typeCheckErrorOutput: null,
    synthPromise: null,
    synthError: null,
    synthedChecksumData: { stackA: "abc" },
    lastDeployingChecksumData: { stackA: "abc" },
    // deploy
    needsReDeploy: false,
    userWillReDeploy: false,
    deployPromise: null,
  });

  // User hits ENTER
  cdkState.handleDeploy();

  expect(onReDeploy).toBeCalledTimes(0);
  expect(cdkState.state).toMatchObject({
    // checks & synth
    synthedChecksumData: { stackA: "abc" },
    lastDeployingChecksumData: { stackA: "abc" },
    // deploy
    needsReDeploy: false,
    userWillReDeploy: false,
    deployPromise: null,
  });
});

test("idle > handleFileChange > build succeeded > synth failed", async () => {
  const onReBuild = jest.fn(() => "rebuild");
  const onLint = jest.fn(() => "lint");
  const onTypeCheck = jest.fn(() => "type-check");
  const onSynth = jest.fn(() => "synth");
  const onReDeploy = jest.fn(() => "redeploy");
  const onAddWatchedFiles = jest.fn(() => "onAddWatchedFiles");
  const onRemoveWatchedFiles = jest.fn(() => "RemoveWatchedFiles");

  const cdkState = new CdkWatcherState({
    inputFiles: ["a.js", "b.js"],
    initialChecksumData: { stackA: "abc" },
    onReBuild,
    onLint,
    onTypeCheck,
    onSynth,
    onReDeploy,
    onAddWatchedFiles,
    onRemoveWatchedFiles,
    onStatusUpdated: jest.fn(),
  });

  cdkState.handleFileChange("a.js");
  cdkState.handleReBuildSucceeded({ inputFiles: ["a.js", "b.js"] });
  cdkState.handleLintDone({ cp: "lint", code: 0 });
  cdkState.handleTypeCheckDone({ cp: "type-check", code: 0 });
  cdkState.handleSynthDone({
    error: { stderr: "Synth error container stderr" },
  });

  expect(onReBuild).toBeCalledTimes(1);
  expect(onLint).toBeCalledTimes(1);
  expect(onTypeCheck).toBeCalledTimes(1);
  expect(onSynth).toBeCalledTimes(1);
  expect(onReDeploy).toBeCalledTimes(0);
  expect(onAddWatchedFiles).toBeCalledTimes(1);
  expect(onRemoveWatchedFiles).toBeCalledTimes(1);
  expect(cdkState.state).toMatchObject({
    inputFiles: ["a.js", "b.js"],
    // build
    buildPromise: null,
    needsReBuild: false,
    buildErrors: null,
    // checks & synth
    needsReCheck: false,
    lintProcess: null,
    lintHasError: null,
    typeCheckProcess: null,
    typeCheckErrorOutput: null,
    synthPromise: null,
    synthError: "Synth error container stderr",
    synthedChecksumData: null,
    // deploy
    needsReDeploy: false,
    userWillReDeploy: false,
    deployPromise: null,
  });
});

test("idle > deploy (nothing to deploy)", async () => {
  const onReDeploy = jest.fn(() => "redeploy");

  const cdkState = new CdkWatcherState({
    inputFiles: ["a.js", "b.js"],
    onReDeploy,
    onStatusUpdated: jest.fn(),
  });

  // User hits ENTER
  cdkState.handleDeploy();

  expect(onReDeploy).toBeCalledTimes(0);
  expect(cdkState.state).toMatchObject({
    // build
    buildPromise: null,
    needsReBuild: false,
    buildErrors: null,
    // deploy
    needsReDeploy: false,
    userWillReDeploy: false,
    deployPromise: null,
  });
});
