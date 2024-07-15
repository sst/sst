#!/usr/bin/env bun

import { $ } from "bun";

// check if git is dirty
const status = await $`git status --porcelain > /dev/null`;
if (status.stdout) {
  console.error("git status is dirty");
  process.exit(1);
}

const version = process.argv[2];
await $`bun run build`;
