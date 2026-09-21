#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";

const DEFAULT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const NAME_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const NAME_MAX_LENGTH = 64;
const DESCRIPTION_MAX_LENGTH = 1024;
const ALLOWED_MODES = new Set(["100644", "100755"]);
const EM_DASH = "\u2014";
const EMOJI_PATTERN = /\p{Extended_Pictographic}|[\u{1F1E6}-\u{1F1FF}]|\uFE0F/gu;
const SCAN_SKIPPED = new Set(["package-lock.json", "LICENSE"]);
const BINARY_EXTENSIONS = /\.(png|jpe?g|gif|webp|ico|svg|pdf|zip|woff2?|ttf)$/i;
const PIN_DOCUMENTS = ["README.md", "CONTRIBUTING.md"];
const PINNED_REF_PATTERN = /\b([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+)#([0-9a-fA-F]+)\b/g;
const FULL_SHA_LENGTH = 40;

function readSkillDirectories(root) {
  const skillsRoot = resolve(root, "skills");
  let entries;
  try {
    entries = readdirSync(skillsRoot, { withFileTypes: true });
  } catch {
    return { skillsRoot, names: undefined };
  }
  const names = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  return { skillsRoot, names };
}

function splitFrontmatter(content) {
  if (!content.startsWith("---\n")) {
    return { ok: false };
  }
  const end = content.indexOf("\n---\n", 3);
  if (end === -1) {
    return { ok: false };
  }
  return { ok: true, block: content.slice(4, end + 1) };
}

function gitFileModes(root, fail) {
  let output;
  try {
    output = execFileSync("git", ["ls-files", "--stage", "-z"], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch {
    fail(`${root}: not a git work tree, so the file-mode check cannot run`);
    return undefined;
  }
  const modes = new Map();
  for (const record of output.split("\0")) {
    if (record === "") {
      continue;
    }
    const match = /^(\d{6}) [0-9a-f]+ \d\t(.*)$/s.exec(record);
    if (match !== null) {
      modes.set(match[2], match[1]);
    }
  }
  return modes;
}

function isScannable(root, relativePath) {
  if (SCAN_SKIPPED.has(relativePath) || BINARY_EXTENSIONS.test(relativePath)) {
    return false;
  }
  try {
    return statSync(resolve(root, relativePath)).isFile();
  } catch {
    return false;
  }
}

function checkCharacters(root, relativePath, fail) {
  const lines = readFileSync(resolve(root, relativePath), "utf8").split("\n");
  lines.forEach((line, index) => {
    if (line.includes(EM_DASH)) {
      fail(
        `${relativePath}:${index + 1}: contains an em dash (U+2014); ` +
          "use a spaced hyphen, a colon, or parentheses instead",
      );
    }
    for (const match of line.matchAll(EMOJI_PATTERN)) {
      const codePoint = match[0].codePointAt(0).toString(16).toUpperCase().padStart(4, "0");
      fail(`${relativePath}:${index + 1}: contains the emoji ${match[0]} (U+${codePoint})`);
    }
  });
}

function checkSkill(root, name, declaredBy, fail) {
  const relativePath = `skills/${name}/SKILL.md`;
  let content;
  try {
    content = readFileSync(resolve(root, relativePath), "utf8");
  } catch {
    fail(`skills/${name}: there is no SKILL.md in this directory`);
    return;
  }

  const split = splitFrontmatter(content);
  if (!split.ok) {
    fail(
      `${relativePath}: no YAML frontmatter block; the file must open with a line ` +
        'reading "---" and close the block with another one',
    );
    return;
  }

  let fields;
  try {
    fields = parseYaml(split.block);
  } catch (error) {
    fail(`${relativePath}: frontmatter is not valid YAML: ${error.message.split("\n")[0]}`);
    return;
  }
  if (fields === null || typeof fields !== "object" || Array.isArray(fields)) {
    fail(`${relativePath}: frontmatter must parse to a mapping of keys to values`);
    return;
  }

  if (typeof fields.name !== "string") {
    fail(`${relativePath}: frontmatter "name" must be a string, got ${typeof fields.name}`);
  } else {
    if (!NAME_PATTERN.test(fields.name) || fields.name.length > NAME_MAX_LENGTH) {
      fail(
        `${relativePath}: frontmatter name "${fields.name}" must match ` +
          `/^[a-z0-9]+(?:-[a-z0-9]+)*$/ and be 1 to ${NAME_MAX_LENGTH} characters`,
      );
    }
    if (fields.name !== name) {
      fail(
        `${relativePath}: frontmatter name "${fields.name}" does not equal its ` +
          `directory name "${name}"`,
      );
    }
    const previous = declaredBy.get(fields.name);
    if (previous === undefined) {
      declaredBy.set(fields.name, relativePath);
    } else {
      fail(
        `duplicate skill name "${fields.name}" declared by ${previous} and ${relativePath}`,
      );
    }
  }

  if (typeof fields.description !== "string") {
    fail(
      `${relativePath}: frontmatter "description" must be a string, got ` +
        `${typeof fields.description}`,
    );
  } else if (fields.description.length > DESCRIPTION_MAX_LENGTH) {
    fail(
      `${relativePath}: frontmatter description is ${fields.description.length} ` +
        `characters, the limit is ${DESCRIPTION_MAX_LENGTH}`,
    );
  }
}

function checkPinnedRefs(root, fail) {
  for (const relativePath of PIN_DOCUMENTS) {
    let content;
    try {
      content = readFileSync(resolve(root, relativePath), "utf8");
    } catch {
      continue;
    }
    content.split("\n").forEach((line, index) => {
      for (const match of line.matchAll(PINNED_REF_PATTERN)) {
        if (match[2].length === FULL_SHA_LENGTH) {
          continue;
        }
        fail(
          `${relativePath}:${index + 1}: pins ${match[1]}#${match[2]}, a hex ref of ` +
            `${match[2].length} characters; the skills installer resolves a bare commit only ` +
            `when it is a full ${FULL_SHA_LENGTH}-character SHA, so an abbreviated one fails ` +
            "to clone; pin a tag or the full SHA instead",
        );
      }
    });
  }
}

function checkReadmeIndex(root, names, fail) {
  const relativePath = "README.md";
  let readme;
  try {
    readme = readFileSync(resolve(root, relativePath), "utf8");
  } catch {
    fail(`${relativePath}: the repository has no README to index the skills in`);
    return;
  }
  const linked = new Set(
    [...readme.matchAll(/skills\/([a-z0-9-]+)\/SKILL\.md/g)].map((match) => match[1]),
  );
  for (const name of names) {
    if (!linked.has(name)) {
      fail(
        `${relativePath}: does not link skills/${name}/SKILL.md; every skill must ` +
          "appear in the README index",
      );
    }
  }
  for (const name of [...linked].sort()) {
    if (!names.includes(name)) {
      fail(
        `${relativePath}: links skills/${name}/SKILL.md, which does not exist; ` +
          "the README index must not name a skill that was removed or renamed",
      );
    }
  }
}

export function validateSkills(root) {
  const failures = [];
  const fail = (message) => failures.push(message);

  const { names } = readSkillDirectories(root);
  if (names === undefined) {
    fail(`${root}: there is no skills/ directory`);
    return failures;
  }
  if (names.length === 0) {
    fail(`${root}/skills: the directory holds no skill directories`);
    return failures;
  }

  const declaredBy = new Map();
  for (const name of names) {
    checkSkill(root, name, declaredBy, fail);
  }

  const modes = gitFileModes(root, fail);
  if (modes !== undefined) {
    for (const [relativePath, mode] of [...modes].sort()) {
      if (!ALLOWED_MODES.has(mode)) {
        fail(
          `${relativePath}: git mode ${mode} is not 100644 or 100755; symlinks and ` +
            "submodules cannot be installed by the skills CLI",
        );
        continue;
      }
      if (isScannable(root, relativePath)) {
        checkCharacters(root, relativePath, fail);
      }
    }
  }

  checkReadmeIndex(root, names, fail);
  checkPinnedRefs(root, fail);
  return failures;
}

function main() {
  const root = resolve(process.argv[2] ?? DEFAULT_ROOT);
  const failures = validateSkills(root);
  if (failures.length > 0) {
    for (const failure of failures) {
      process.stderr.write(`validate-skills: ${failure}\n`);
    }
    process.stderr.write(
      `validate-skills: ${failures.length} problem(s) found in ${root}\n`,
    );
    process.exit(1);
  }
  const { names } = readSkillDirectories(root);
  process.stdout.write(`validate-skills: ${names.length} skill(s) valid: ${names.join(", ")}\n`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
