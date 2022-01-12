import { execSync } from "child_process";

function getProjectIdByGit() {
  try {
    const originBuffer = execSync(
      `git config --local --get remote.origin.url`,
      {
        timeout: 1000,
        stdio: `pipe`,
      }
    );

    return String(originBuffer).trim();
  } catch (_) {
    return null;
  }
}

export function getRawProjectId(): string {
  return getProjectIdByGit() || process.env.REPOSITORY_URL || process.cwd();
}
