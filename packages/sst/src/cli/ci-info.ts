import ciInfo from "ci-info";

export function getCiInfo() {
  const isSeed = !!process.env.SEED_APP_NAME;
  return {
    isCI: ciInfo.isCI || isSeed,
    name: (isSeed ? "Seed" : ciInfo.name) || null,
  };
}
