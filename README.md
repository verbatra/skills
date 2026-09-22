<h1 align="center">verbatra skills</h1>

<p align="center">
  Agent skills for <a href="https://github.com/verbatra/verbatra">verbatra</a>, the i18n translation automation tool.
</p>

<p align="center">
  <a href="https://github.com/verbatra/skills/actions/workflows/validate.yml"><img src="https://img.shields.io/github/actions/workflow/status/verbatra/skills/validate.yml?branch=main&label=validate&color=7b1fa2&labelColor=0B0B12" alt="Validate" /></a>
  <a href="https://github.com/verbatra/skills/actions/workflows/parity.yml"><img src="https://img.shields.io/github/actions/workflow/status/verbatra/skills/parity.yml?branch=main&label=parity&color=7b1fa2&labelColor=0B0B12" alt="Tool parity" /></a>
  <a href="https://www.npmjs.com/package/@verbatra/cli"><img src="https://img.shields.io/npm/v/%40verbatra%2Fcli?label=%40verbatra%2Fcli&color=7b1fa2&labelColor=0B0B12" alt="@verbatra/cli on npm" /></a>
  <a href="https://www.skills.sh/verbatra/skills"><img src="https://www.skills.sh/b/verbatra/skills" alt="verbatra/skills on skills.sh" /></a>
  <a href="https://scorecard.dev/viewer/?uri=github.com/verbatra/skills"><img src="https://img.shields.io/ossf-scorecard/github.com/verbatra/skills?label=openssf%20scorecard&labelColor=0B0B12" alt="OpenSSF Scorecard" /></a>
  <a href="./LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg?color=7b1fa2&labelColor=0B0B12" alt="License: MIT" /></a>
</p>

## Install

```bash
npx skills@latest add verbatra/skills --skill '*' -a claude-code -y
```

That installs all three skills. The slugs are `verbatra-cli`, `verbatra-mcp-tools` and
`verbatra-studio-agent-tools`; pass one to `--skill` instead of `'*'` for a single skill, and
repeat `--skill` to pick a subset. Add `-g` to install for your user instead of the current
project, and repeat `-a` to target another agent. The install writes the skill into your agent
directory and records a row in your own `skills-lock.json`.

### Pinning a version

A bare `verbatra/skills` tracks the default branch, so an update can change the skill under you.
The `#` fragment pins a ref. The installer resolves it as a branch or a tag first and only then
as a bare commit, which is what decides the behaviour of each form:

| Ref after `#` | What you get |
| --- | --- |
| nothing | the default branch, re-resolved on every install |
| a branch name | that branch's tip, re-resolved on every install |
| a tag | frozen at the tagged commit; the pin to prefer |
| a full 40-character commit SHA | frozen at that commit |
| an abbreviated commit SHA | nothing; the install fails |

An abbreviated SHA fails rather than resolving. The installer clones with
`git clone --depth 1 --branch <ref>`, and it retries by fetching a bare commit only when the ref
matches `/^[0-9a-f]{40}$/i`. A short SHA matches no branch and no tag and never reaches that
retry, so `#0a1b2c3` reports `fatal: Remote branch 0a1b2c3 not found in upstream origin`.

Pin to a tag, which is short enough to read in a diff:

```bash
npx skills@latest add verbatra/skills#v0.1.0 --skill verbatra-cli -a claude-code -y
```

Pin to a full commit SHA when the commit you want was never tagged:

```bash
npx skills@latest add verbatra/skills#ae31c921872cad8f70989ef75ad43064b6ffb1bd --skill verbatra-cli -a claude-code -y
```

## Skills

- **[verbatra-cli](./skills/verbatra-cli/SKILL.md)**: Drive the verbatra i18n CLI from a shell or CI. Covers every command the binary registers, which of them cost money, the exit codes, the JSON envelope, the supported formats and providers, and what `verbatra.lock.json` means.
- **[verbatra-mcp-tools](./skills/verbatra-mcp-tools/SKILL.md)**: Operate a verbatra project through the verbatra stdio MCP server. Covers every registered tool, the spend boundary that keeps the provider-spending tools off the default tool list, how to work a status check into an edit, and what each result actually means.
- **[verbatra-studio-agent-tools](./skills/verbatra-studio-agent-tools/SKILL.md)**: Operate a verbatra project from an open Verbatra Studio dashboard tab through its WebMCP browser tools. Covers the tool set, the two gates that decide which tools register, the two methods this surface adds over the stdio server, and the traps specific to driving a browser tab.

## What these are

Each skill is one Markdown document that gives a coding agent the operating knowledge for one
verbatra surface: the CLI, the stdio MCP server, or the Studio dashboard. They are written for the
things an agent gets wrong when it is only shown a command list: that a translate run bills a
provider the moment it starts and has no confirmation prompt, that API keys exist only as
environment variables, that `prune` deletes target keys and is a config field as well as a flag,
and that a translatable string is untrusted data rather than an instruction. The reference
material they link to lives on the [documentation site](https://verbatra.kreitz-webdev.de/docs);
the skills carry the judgement, not a copy of the reference.

## How they stay in sync with the code

Prose about a tool rots the first time the tool changes. These skills enumerate real surfaces in
tables (CLI commands, formats, providers and their environment variables, MCP tool names, Studio
RPC methods), and the [parity workflow](./.github/workflows/parity.yml) asserts each of those
tables, and the counts spelled out in the prose, against the real registries in
[verbatra/verbatra](https://github.com/verbatra/verbatra). It checks out the source repository
next to this one and reads `packages/cli/src/run.ts`, `packages/core/src/model/supported-format.ts`,
`packages/sdk/src/config/provider-config.ts`, `packages/ai-providers/src/env.ts`,
`packages/mcp/src/tools/`, `packages/studio/src/shared/rpc/` and
`packages/studio/src/webmcp/register-tools.ts`. It runs on every push to `main` and every pull
request targeting `main`, on a nightly schedule so that a change made only in the source
repository is still caught, on a `workflow_dispatch` that takes the source ref to assert against,
and on a `repository_dispatch` so a release can trigger it directly.

A second workflow, [validate](./.github/workflows/validate.yml), runs offline on every push to
`main` and every pull request targeting `main`: it checks the frontmatter, the naming rules, the
file modes, the house style, the pinned refs this README and `CONTRIBUTING.md` hand to a reader,
and that this README indexes exactly the skills that exist, then asks the real installer to
resolve the repository and confirms it finds every skill and nothing else.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for how to add a skill, the parity rule and why it
exists, and how to run both checks locally against a checkout of the source repository.

## License

[MIT](./LICENSE)
