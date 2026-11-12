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

const ENTRY_SECTIONS =
  "\n## Which surface\n\n## Non-negotiable rules\n\n## Decision flow\n\n## Done when\n" +
  "\n## Where the depth lives\n\n## Reference\n";

function skillFile(
  name,
  { description = GOOD_DESCRIPTION, body = "# heading\n", sections = ENTRY_SECTIONS } = {},
) {
  return `---\nname: ${name}\ndescription: ${description}\nlicense: MIT\n---\n\n${body}${sections}`;
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
    if (content === null) {
      continue;
    }
    const absolute = resolve(root, relativePath);
    mkdirSync(dirname(absolute), { recursive: true });
    writeFileSync(absolute, content);
  }
  execFileSync("git", ["init", "--quiet", "--initial-branch=main"], { cwd: root });
  execFileSync("git", ["add", "--all"], { cwd: root });
  return root;
}

const GOOD_INTERFACE =
  'interface:\n  display_name: "verbatra CLI"\n  short_description: "Run verbatra safely"\n';

function validFixture(overrides = {}) {
  return fixture({
    "README.md": readmeFor(["verbatra-cli"]),
    "skills/verbatra-cli/SKILL.md": skillFile("verbatra-cli"),
    "skills/verbatra-cli/agents/openai.yaml": GOOD_INTERFACE,
    ...overrides,
  });
}

function commandsFixture(commands) {
  return validFixture({
    "skills/verbatra-cli/SKILL.md": skillFile("verbatra-cli", {
      body: "# heading\n\nSee [COMMANDS.md](COMMANDS.md).\n",
    }),
    "skills/verbatra-cli/COMMANDS.md": commands,
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
  it("rule 21: an entry missing one of the fixed sections", () => {
    const root = validFixture({
      "skills/verbatra-cli/SKILL.md": skillFile("verbatra-cli", {
        sections: ENTRY_SECTIONS.replace("\n## Done when\n", ""),
      }),
    });
    expect(validateSkills(root)).toEqual([
      'skills/verbatra-cli/SKILL.md: has no "## Done when" section; every entry carries ' +
        '"## Which surface", "## Non-negotiable rules", "## Decision flow", "## Done when", ' +
        '"## Where the depth lives", "## Reference", in that order',
    ]);
  });

  it("rule 21: an entry with its fixed sections out of order", () => {
    const root = validFixture({
      "skills/verbatra-cli/SKILL.md": skillFile("verbatra-cli", {
        sections:
          "\n## Which surface\n\n## Decision flow\n\n## Non-negotiable rules\n\n## Done when\n" +
          "\n## Where the depth lives\n\n## Reference\n",
      }),
    });
    expect(validateSkills(root)).toEqual([
      'skills/verbatra-cli/SKILL.md: "## Decision flow" comes before the section that should ' +
        "precede it",
    ]);
  });

  it("rule 21: a section heading inside a fenced block does not count", () => {
    const root = validFixture({
      "skills/verbatra-cli/SKILL.md": skillFile("verbatra-cli", {
        sections: `\n\`\`\`md${ENTRY_SECTIONS}\`\`\`\n`,
      }),
    });
    expect(validateSkills(root)).toHaveLength(6);
  });

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

  it("rule 8b: a description over the 500 character lean limit", () => {
    const root = validFixture({
      "skills/verbatra-cli/SKILL.md": skillFile("verbatra-cli", { description: "a".repeat(501) }),
    });
    expect(validateSkills(root)).toContain(
      "skills/verbatra-cli/SKILL.md: frontmatter description is 501 characters; keep it to 500 or fewer, as triggers only, and move detail into the body or a sibling file",
    );
  });

  it("rule 8c: a description of exactly 500 characters is accepted", () => {
    const root = validFixture({
      "skills/verbatra-cli/SKILL.md": skillFile("verbatra-cli", { description: "a".repeat(500) }),
    });
    expect(validateSkills(root)).toEqual([]);
  });

  it("rule 10: a skill without agents/openai.yaml", () => {
    const root = validFixture({ "skills/verbatra-cli/agents/openai.yaml": null });
    expect(validateSkills(root)).toContain(
      "skills/verbatra-cli/agents/openai.yaml: missing; every skill needs an interface file with display_name and short_description",
    );
  });

  it("rule 10: an interface without a short_description", () => {
    const root = validFixture({
      "skills/verbatra-cli/agents/openai.yaml": 'interface:\n  display_name: "verbatra CLI"\n',
    });
    expect(validateSkills(root)).toContain(
      "skills/verbatra-cli/agents/openai.yaml: interface.short_description must be a non-empty string",
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

  it("rule 19: a sibling document linking a markdown file that does not exist", () => {
    const root = commandsFixture("# Commands\n\nSee [the table](MISSING.md) and [ok](SKILL.md).\n");
    expect(validateSkills(root)).toContain(
      "skills/verbatra-cli/COMMANDS.md:3: links MISSING.md, which does not exist",
    );
  });

  it("rule 19: a link inside a fenced block is not checked", () => {
    const root = commandsFixture("# Commands\n\n```md\n[x](MISSING.md)\n```\n");
    expect(validateSkills(root)).toEqual([]);
  });

  it("rule 20: a sibling document over 100 lines without a table of contents", () => {
    const filler = Array.from({ length: 100 }, (_, index) => `line ${index}`).join("\n");
    const root = commandsFixture(`# Commands\n\n## One\n\n${filler}\n`);
    const lines = `# Commands\n\n## One\n\n${filler}\n`.split("\n").length;
    expect(validateSkills(root)).toContain(
      `skills/verbatra-cli/COMMANDS.md: has ${lines} lines; a reference file over 100 lines needs a table of contents of at least 2 "- [Heading](#heading)" links under its title, before the first ## heading`,
    );
  });

  it("rule 20: a table of contents link that matches no heading", () => {
    const filler = Array.from({ length: 100 }, (_, index) => `line ${index}`).join("\n");
    const toc = "- [One](#one)\n- [Two](#two)\n";
    const root = commandsFixture(`# Commands\n\n${toc}\n## One\n\n${filler}\n`);
    expect(validateSkills(root)).toContain(
      "skills/verbatra-cli/COMMANDS.md: table of contents links #two, which matches no heading",
    );
  });

  it("rule 20: a long document with a matching table of contents is accepted", () => {
    const filler = Array.from({ length: 100 }, (_, index) => `line ${index}`).join("\n");
    const toc = "- [One](#one)\n  - [Sub part](#sub-part)\n";
    const root = commandsFixture(`# Commands\n\n${toc}\n## One\n\n### Sub part\n\n${filler}\n`);
    expect(validateSkills(root)).toEqual([]);
  });

  it("rule 21: a sibling document the SKILL.md does not link", () => {
    const root = validFixture({
      "skills/verbatra-cli/COMMANDS.md": "# Commands\n",
    });
    expect(validateSkills(root)).toContain(
      "skills/verbatra-cli/SKILL.md: does not link COMMANDS.md; every sibling document must be linked from its entry",
    );
  });

  it("rule 21: a sibling document the SKILL.md links is accepted", () => {
    const root = validFixture({
      "skills/verbatra-cli/SKILL.md": skillFile("verbatra-cli", {
        body: "# heading\n\nSee [COMMANDS.md](COMMANDS.md).\n",
      }),
      "skills/verbatra-cli/COMMANDS.md": "# Commands\n",
    });
    expect(validateSkills(root)).toEqual([]);
  });

  const filler = Array.from({ length: 100 }, (_, index) => `line ${index}`).join("\n");

  it("rule 20: a document of 100 lines or fewer needs no table of contents", () => {
    const body = Array.from({ length: 95 }, (_, index) => `line ${index}`).join("\n");
    const root = commandsFixture(`# Commands\n\n## One\n\n${body}\n`);
    expect(validateSkills(root)).toEqual([]);
  });

  it("rule 20: SKILL.md is exempt from the table of contents rule", () => {
    const root = validFixture({
      "skills/verbatra-cli/SKILL.md": skillFile("verbatra-cli", {
        body: `# heading\n\n## One\n\n${filler}\n`,
      }),
    });
    expect(validateSkills(root)).toEqual([]);
  });

  it("rule 20: a table of contents placed after the first ## heading is rejected", () => {
    const root = commandsFixture(`# Commands\n\n## One\n\n- [One](#one)\n- [Two](#two)\n\n## Two\n\n${filler}\n`);
    expect(
      validateSkills(root).some((failure) => failure.includes("needs a table of contents")),
    ).toBe(true);
  });

  it("rule 20: duplicate headings take GitHub's -1 suffix", () => {
    const toc = "- [Same](#same)\n- [Same](#same-1)\n";
    const root = commandsFixture(`# Commands\n\n${toc}\n## Same\n\n## Same\n\n${filler}\n`);
    expect(validateSkills(root)).toEqual([]);
  });

  it("rule 20: a heading with unicode letters keeps them in its anchor", () => {
    const toc = "- [Zur\u00fcck](#zur\u00fcck)\n- [Two](#two)\n";
    const root = commandsFixture(`# Commands\n\n${toc}\n## Zur\u00fcck\n\n## Two\n\n${filler}\n`);
    expect(validateSkills(root)).toEqual([]);
  });

  it("rule 19: a link inside an indented fenced block is not checked", () => {
    const root = commandsFixture("# Commands\n\n   ```md\n   [x](MISSING.md)\n   ```\n");
    expect(validateSkills(root)).toEqual([]);
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
