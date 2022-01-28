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

export function normalizeGitUrl(url: string): string {
  // Normalize url
  // - https://x-access-token:ghs_xxxx@github.com/user/repo.git
  // - https://github.com/user/repo.git
  // - git@github.com:user/repo.git

  // trim
  url = url.trim();

  // clean up ending `.git`
  url = url.endsWith(".git") ? url.substring(0, url.length - 4) : url;

  if (url.startsWith("git@")) {
    const match = url.match(/git@([^:]+):(.*)/);
    if (match && match.length > 2) {
      return `${match[1]}/${match[2]}`;
    }
  } else if (url.startsWith("http://") || url.startsWith("https://")) {
    const match = url.match(/https?:\/\/([^@]+@)?(.*)/);
    if (match && match.length > 2) {
      return match[2];
    }
  }

  return url;
}

export function getRawProjectId(): string {
  const gitUrl = getProjectIdByGit();
  if (gitUrl) {
    return normalizeGitUrl(gitUrl);
  }

  const repoUrl = process.env.REPOSITORY_URL;
  if (repoUrl) {
    return normalizeGitUrl(repoUrl);
  }

  return process.cwd();
}
