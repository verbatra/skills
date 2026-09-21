#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const expected = readdirSync(resolve(ROOT, "skills"), { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();

let output;
try {
  output = execFileSync("npx", ["--yes", "skills@latest", "add", ".", "--list"], {
    cwd: ROOT,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
  });
} catch (error) {
  process.stderr.write(
    `check-discovery: "npx skills@latest add . --list" exited with ${error.status}\n`,
  );
  process.exit(1);
}

process.stdout.write(output);

const plain = output
  .replace(/\u001B\[[0-9;?]*[A-Za-z]/g, "")
  .replace(/[^\S\n]+/g, " ");

const failures = [];

const declared = /Found (\d+) skills?/.exec(plain);
if (declared === null) {
  failures.push('the installer never printed a "Found <n> skills" line');
} else if (Number(declared[1]) !== expected.length) {
  failures.push(
    `the installer found ${declared[1]} skills, but skills/ holds ${expected.length}`,
  );
}

for (const name of expected) {
  if (!new RegExp(`(^|[^a-z0-9-])${name}([^a-z0-9-]|$)`, "m").test(plain)) {
    failures.push(`the installer never listed ${name}`);
  }
}

if (failures.length > 0) {
  for (const failure of failures) {
    process.stderr.write(`check-discovery: ${failure}\n`);
  }
  process.exit(1);
}

process.stdout.write(
  `check-discovery: the installer resolves exactly ${expected.length} skills: ` +
    `${expected.join(", ")}\n`,
);
