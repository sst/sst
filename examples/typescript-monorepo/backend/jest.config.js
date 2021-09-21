module.exports = {
  // setupFilesAfterEnv: ["<rootDir>/test/setup.ts"],
  roots: ["<rootDir>/test"],
  testMatch: ["**/*.*test.(ts|tsx|js)"],
  transform: {
    "\\.ts$": "esbuild-runner/jest",
  },
};
