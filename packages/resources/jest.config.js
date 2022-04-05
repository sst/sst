module.exports = {
  roots: ["<rootDir>"],
  testEnvironment: "node",
  testMatch: [
    "**/__tests__/**/*.+(ts|tsx|js)",
    "**/?(*.)+(spec|test).+(ts|tsx|js)",
  ],
  transform: {
    "^.+\\.(ts|tsx)$": ["ts-jest"],
  },
  setupFilesAfterEnv: ["<rootDir>/test/setup-tests.js"],
};
