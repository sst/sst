import fs from "node:fs/promises";
import path from "node:path";
import { exec, execSync } from "node:child_process";

const THANKLESS_COMMITTERS = ["thdxr", "fwang", "jayair"];

const version = await new Promise((resolve) => {
  let data = "";
  const proc = exec(`npm show @serverless-stack/cli dist-tags.latest`, {
    stdio: "pipe",
  });
  proc.stdout.on("data", (chunk) => (data += chunk));
  proc.on("exit", () => {
    resolve(data.trim());
  });
});

const changesets = JSON.parse(await fs.readFile(".changeset/config.json"));
const packages = changesets.fixed[0];

const changes = new Set();
for (const pkg of packages) {
  const changelog = path.join(
    "packages",
    pkg.split("/").at(-1),
    "CHANGELOG.md"
  );
  const lines = (await fs.readFile(changelog)).toString().split("\n");
  let start = false;
  for (let line of lines) {
    if (!start) {
      if (line === `## ${version}`) {
        start = true;
        continue;
      }
    }

    if (start) {
      if (line.startsWith("-")) {
        if (line.includes("Updated dependencies")) continue;
        if (line.includes("@serverless-stack/")) continue;

        for (const user of THANKLESS_COMMITTERS) {
          line = line.replace(
            `Thanks [@${user}](https://github.com/${user})! `,
            ""
          );
        }
        changes.add(line);
        continue;
      }

      if (line.startsWith("## ")) break;
    }
  }
}

const notes = [
  "#### Changes",
  ...changes,
  `---`,
  `Update using:`,
  "``` sh",
  "$ npx sst update v1.1.0",
  "$ yarn sst update v1.1.0",
  "```",
];
console.log(notes.join("\n"));

execSync(`git tag v${version}`);
execSync(`git push origin --tags`);
