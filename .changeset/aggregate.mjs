import fs from "node:fs/promises";
import path from "node:path";
import { execSync } from "node:child_process";

const THANKLESS_COMMITTERS = ["thdxr", "fwang", "jayair"];

const { version } = JSON.parse(
  await fs.readFile("./packages/sst/package.json")
);

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
      if (line.startsWith("-") || line.startsWith("*")) {
        if (line.includes("Updated dependencies")) continue;
        if (line.includes("@sst/")) continue;

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
  "$ npx sst update " + version,
  "$ yarn sst update " + version,
  "```",
];
console.log(notes.join("\n"));
console.log(`::set-output name=notes::${notes.join("%0A")}`);
console.log(`::set-output name=version::v${version}`);

execSync(`git tag v${version}`);
execSync(`git push origin --tags`);
