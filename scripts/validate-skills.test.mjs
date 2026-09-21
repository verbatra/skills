import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { validateSkills } from "./validate-skills.mjs";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const VALIDATOR = resolve(REPO_ROOT, "scripts/validate-skills.mjs");

const GOOD_DESCRIPTION =
  "Drive the verbatra i18n CLI from a shell or CI. Use when locale files are out of sync.";

const created = [];

afterEach(() => {
  while (created.length > 0) {
    rmSync(created.pop(), { recursive: true, force: true });
  }
});

function skillFile(name, { description = GOOD_DESCRIPTION, body = "# heading\n" } = {}) {
  return `---\nname: ${name}\ndescription: ${description}\nlicense: MIT\n---\n\n${body}`;
}

function readmeFor(names, install = "") {
  const index = names.map((name) => `- [${name}](./skills/${name}/SKILL.md): a skill.`);
  return `# verbatra skills\n\n## Skills\n\n${index.join("\n")}\n${install}`;
}

const FULL_SHA = "ae31c921872cad8f70989ef75ad43064b6ffb1bd";

function installLine(ref) {
  return `\n## Install\n\nnpx skills@latest add verbatra/skills#${ref} --skill verbatra-cli\n`;
}

function fixture(files) {
  const root = mkdtempSync(resolve(tmpdir(), "verbatra-skills-fixture-"));
  created.push(root);
  for (const [relativePath, content] of Object.entries(files)) {
    const absolute = resolve(root, relativePath);
    mkdirSync(dirname(absolute), { recursive: true });
    writeFileSync(absolute, content);
  }
  execFileSync("git", ["init", "--quiet", "--initial-branch=main"], { cwd: root });
  execFileSync("git", ["add", "--all"], { cwd: root });
  return root;
}

function validFixture(overrides = {}) {
  return fixture({
    "README.md": readmeFor(["verbatra-cli"]),
    "skills/verbatra-cli/SKILL.md": skillFile("verbatra-cli"),
    ...overrides,
  });
}

describe("the validator accepts a well-formed repository", () => {
  it("reports no failures for a valid fixture", () => {
    expect(validateSkills(validFixture())).toEqual([]);
  });

  it("reports no failures for this repository", () => {
    expect(validateSkills(REPO_ROOT)).toEqual([]);
  });

  it("accepts a pin to a tag, which the installer resolves as a ref", () => {
    const root = validFixture({
      "README.md": readmeFor(["verbatra-cli"], installLine("v0.1.0")),
    });
    expect(validateSkills(root)).toEqual([]);
  });

  it("accepts a pin to a full 40-character commit SHA", () => {
    const root = validFixture({
      "README.md": readmeFor(["verbatra-cli"], installLine(FULL_SHA)),
      "CONTRIBUTING.md": `# Contributing\n\nPin with verbatra/skills#${FULL_SHA}.\n`,
    });
    expect(validateSkills(root)).toEqual([]);
  });

  it("ignores a bare hex fragment that is not attached to a repository slug", () => {
    const root = validFixture({
      "README.md": readmeFor(["verbatra-cli"], "\nA short ref such as #0a1b2c3 fails.\n"),
    });
    expect(validateSkills(root)).toEqual([]);
  });

  it("exits zero for this repository", () => {
    expect(() =>
      execFileSync(process.execPath, [VALIDATOR], { cwd: REPO_ROOT, stdio: "pipe" }),
    ).not.toThrow();
  });
});

describe("every rule fires with a precise message", () => {
  it("rule 1: a skills directory with no SKILL.md", () => {
    const root = validFixture({
      "README.md": readmeFor(["verbatra-cli", "orphan"]),
      "skills/orphan/notes.md": "no skill here\n",
    });
    expect(validateSkills(root)).toContain(
      "skills/orphan: there is no SKILL.md in this directory",
    );
  });

  it("rule 2: a SKILL.md with no frontmatter block", () => {
    const root = validFixture({ "skills/verbatra-cli/SKILL.md": "# no frontmatter\n" });
    expect(validateSkills(root)).toContain(
      'skills/verbatra-cli/SKILL.md: no YAML frontmatter block; the file must open with a line reading "---" and close the block with another one',
    );
  });

  it("rule 3: frontmatter that is not valid YAML", () => {
    const root = validFixture({
      "skills/verbatra-cli/SKILL.md": "---\nname: [unclosed\n---\n\nbody\n",
    });
    expect(validateSkills(root).join("\n")).toContain(
      "skills/verbatra-cli/SKILL.md: frontmatter is not valid YAML:",
    );
  });

  it("rule 4: a non-string name", () => {
    const root = validFixture({
      "skills/verbatra-cli/SKILL.md": `---\nname: 42\ndescription: ${GOOD_DESCRIPTION}\n---\n\nbody\n`,
    });
    expect(validateSkills(root)).toContain(
      'skills/verbatra-cli/SKILL.md: frontmatter "name" must be a string, got number',
    );
  });

  it("rule 5: a non-string description", () => {
    const root = validFixture({
      "skills/verbatra-cli/SKILL.md": "---\nname: verbatra-cli\ndescription:\n---\n\nbody\n",
    });
    expect(validateSkills(root)).toContain(
      'skills/verbatra-cli/SKILL.md: frontmatter "description" must be a string, got object',
    );
  });

  it("rule 6: a name that breaks the naming pattern", () => {
    const root = fixture({
      "README.md": readmeFor(["verbatra-cli"]),
      "skills/verbatra-cli/SKILL.md": skillFile("Verbatra_CLI"),
    });
    expect(validateSkills(root)).toContain(
      'skills/verbatra-cli/SKILL.md: frontmatter name "Verbatra_CLI" must match /^[a-z0-9]+(?:-[a-z0-9]+)*$/ and be 1 to 64 characters',
    );
  });

  it("rule 7: a name that does not equal its directory", () => {
    const root = fixture({
      "README.md": readmeFor(["verbatra-cli"]),
      "skills/verbatra-cli/SKILL.md": skillFile("verbatra-command-line"),
    });
    expect(validateSkills(root)).toContain(
      'skills/verbatra-cli/SKILL.md: frontmatter name "verbatra-command-line" does not equal its directory name "verbatra-cli"',
    );
  });

  it("rule 8: a description over 1024 characters", () => {
    const root = validFixture({
      "skills/verbatra-cli/SKILL.md": skillFile("verbatra-cli", { description: "a".repeat(1025) }),
    });
    expect(validateSkills(root)).toContain(
      "skills/verbatra-cli/SKILL.md: frontmatter description is 1025 characters, the limit is 1024",
    );
  });

  it("rule 9: two directories declaring the same name", () => {
    const root = fixture({
      "README.md": readmeFor(["verbatra-cli", "verbatra-cli-copy"]),
      "skills/verbatra-cli/SKILL.md": skillFile("verbatra-cli"),
      "skills/verbatra-cli-copy/SKILL.md": skillFile("verbatra-cli"),
    });
    expect(validateSkills(root)).toContain(
      'duplicate skill name "verbatra-cli" declared by skills/verbatra-cli/SKILL.md and skills/verbatra-cli-copy/SKILL.md',
    );
  });

  it("rule 10: a tracked symlink", () => {
    const root = validFixture({
      "README.md": readmeFor(["verbatra-cli", "verbatra-alias"]),
      "skills/verbatra-alias/placeholder": "",
    });
    symlinkSync(
      "../verbatra-cli/SKILL.md",
      resolve(root, "skills/verbatra-alias/SKILL.md"),
    );
    execFileSync("git", ["add", "--all"], { cwd: root });
    expect(validateSkills(root)).toContain(
      "skills/verbatra-alias/SKILL.md: git mode 120000 is not 100644 or 100755; symlinks and submodules cannot be installed by the skills CLI",
    );
  });

  it("rule 11: an em dash anywhere in a tracked file", () => {
    const root = validFixture({
      "skills/verbatra-cli/SKILL.md": skillFile("verbatra-cli", {
        body: "# heading\n\nfirst line\nsecond \u2014 line\n",
      }),
    });
    expect(validateSkills(root)).toContain(
      "skills/verbatra-cli/SKILL.md:10: contains an em dash (U+2014); use a spaced hyphen, a colon, or parentheses instead",
    );
  });

  it("rule 12: an emoji anywhere in a tracked file", () => {
    const root = validFixture({
      "skills/verbatra-cli/SKILL.md": skillFile("verbatra-cli", {
        body: "# heading\n\nshipped \u{1F680} today\n",
      }),
    });
    expect(validateSkills(root)).toContain(
      "skills/verbatra-cli/SKILL.md:9: contains the emoji \u{1F680} (U+1F680)",
    );
  });

  it("rule 13: a skill the README does not index", () => {
    const root = fixture({
      "README.md": readmeFor([]),
      "skills/verbatra-cli/SKILL.md": skillFile("verbatra-cli"),
    });
    expect(validateSkills(root)).toContain(
      "README.md: does not link skills/verbatra-cli/SKILL.md; every skill must appear in the README index",
    );
  });

  it("rule 14: a README entry for a skill that does not exist", () => {
    const root = fixture({
      "README.md": readmeFor(["verbatra-cli", "verbatra-retired"]),
      "skills/verbatra-cli/SKILL.md": skillFile("verbatra-cli"),
    });
    expect(validateSkills(root)).toContain(
      "README.md: links skills/verbatra-retired/SKILL.md, which does not exist; the README index must not name a skill that was removed or renamed",
    );
  });

  it("rule 15: a root that is not a git work tree", () => {
    const root = mkdtempSync(resolve(tmpdir(), "verbatra-skills-nogit-"));
    created.push(root);
    mkdirSync(resolve(root, "skills/verbatra-cli"), { recursive: true });
    writeFileSync(resolve(root, "README.md"), readmeFor(["verbatra-cli"]));
    writeFileSync(resolve(root, "skills/verbatra-cli/SKILL.md"), skillFile("verbatra-cli"));
    expect(validateSkills(root)).toContain(
      `${root}: not a git work tree, so the file-mode check cannot run`,
    );
  });

  it("rule 16: a repository with no skills directory", () => {
    const root = fixture({ "README.md": "# empty\n" });
    expect(validateSkills(root)).toEqual([`${root}: there is no skills/ directory`]);
  });

  it("rule 17: a README pinning an abbreviated commit SHA", () => {
    const root = validFixture({
      "README.md": readmeFor(["verbatra-cli"], installLine("0a1b2c3")),
    });
    expect(validateSkills(root)).toContain(
      "README.md:9: pins verbatra/skills#0a1b2c3, a hex ref of 7 characters; the skills installer resolves a bare commit only when it is a full 40-character SHA, so an abbreviated one fails to clone; pin a tag or the full SHA instead",
    );
  });

  it("rule 18: a CONTRIBUTING.md pinning an abbreviated commit SHA", () => {
    const root = validFixture({
      "CONTRIBUTING.md": "# Contributing\n\nPin a release with verbatra/skills#deadbeef.\n",
    });
    expect(validateSkills(root)).toContain(
      "CONTRIBUTING.md:3: pins verbatra/skills#deadbeef, a hex ref of 8 characters; the skills installer resolves a bare commit only when it is a full 40-character SHA, so an abbreviated one fails to clone; pin a tag or the full SHA instead",
    );
  });
});

describe("the command-line entry point", () => {
  it("exits non-zero and names every failure on stderr", () => {
    const root = fixture({
      "README.md": readmeFor([]),
      "skills/verbatra-cli/SKILL.md": skillFile("wrong-name"),
    });
    let status;
    let stderr = "";
    try {
      execFileSync(process.execPath, [VALIDATOR, root], { stdio: "pipe" });
      status = 0;
    } catch (error) {
      status = error.status;
      stderr = error.stderr.toString();
    }
    expect(status).toBe(1);
    expect(stderr).toContain(
      'validate-skills: skills/verbatra-cli/SKILL.md: frontmatter name "wrong-name" does not equal its directory name "verbatra-cli"',
    );
    expect(stderr).toContain(
      "validate-skills: README.md: does not link skills/verbatra-cli/SKILL.md",
    );
    expect(stderr).toMatch(/validate-skills: \d+ problem\(s\) found in /);
  });
});
