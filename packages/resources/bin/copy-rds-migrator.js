#!/usr/bin/env node

const fs = require("fs-extra");

fs.rmSync("dist/RDS_migrator", { recursive: true, force: true });
fs.copySync("assets/RDS/migrator", "dist/RDS_migrator");
