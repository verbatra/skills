<h1 align="center">verbatra skills</h1>

<p align="center">
  Agent skills for <a href="https://github.com/verbatra/verbatra">verbatra</a>, the i18n translation automation tool.
</p>

<p align="center">
  <a href="https://github.com/verbatra/skills/actions/workflows/validate.yml"><img src="https://github.com/verbatra/skills/actions/workflows/validate.yml/badge.svg?branch=main" alt="Validate" /></a>
  <a href="https://github.com/verbatra/skills/actions/workflows/parity.yml"><img src="https://github.com/verbatra/skills/actions/workflows/parity.yml/badge.svg?branch=main" alt="Tool parity" /></a>
  <a href="./LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License: MIT" /></a>
</p>

## Skills

- **[verbatra-cli](./skills/verbatra-cli/SKILL.md)**: Drive the verbatra i18n CLI from a shell or CI. Covers `translate`, `watch`, `check`, `diff`, `doctor`, `export`, `import`, `tmx`, `extract`, `pseudo`, `types` and `init`, which commands cost money, the exit codes, the JSON envelope, the supported formats and providers, and what `verbatra.lock.json` means.
- **[verbatra-mcp-tools](./skills/verbatra-mcp-tools/SKILL.md)**: Operate a verbatra project through the verbatra stdio MCP server. Covers every registered tool, the spend boundary that keeps the provider-spending tools off the default tool list, how to work a status check into an edit, and what each result actually means.
- **[verbatra-studio-agent-tools](./skills/verbatra-studio-agent-tools/SKILL.md)**: Operate a verbatra project from an open Verbatra Studio dashboard tab through its WebMCP browser tools. Covers the tool set, the two gates that decide which tools register, the two methods this surface adds over the stdio server, and the traps specific to driving a browser tab.

## Install

Install one skill:

```bash
npx skills@latest add verbatra/skills --skill verbatra-cli -a claude-code -y
```

```bash
npx skills@latest add verbatra/skills --skill verbatra-mcp-tools -a claude-code -y
```

```bash
npx skills@latest add verbatra/skills --skill verbatra-studio-agent-tools -a claude-code -y
```

Install all three:

```bash
npx skills@latest add verbatra/skills --skill '*' -a claude-code -y
```

Repeat `--skill` to pick a subset, add `-g` to install for your user instead of the current
project, and repeat `-a` to target another agent. The install writes the skill into your agent
directory and records a row in your own `skills-lock.json`.

A bare `verbatra/skills` tracks the default branch, so an update can change the skill under you.
Pin a ref with the `#` fragment, which takes a branch, a tag or a commit SHA:

```bash
npx skills@latest add verbatra/skills#0a1b2c3 --skill verbatra-cli -a claude-code -y
```

## What these are

Each skill is one Markdown document that gives a coding agent the operating knowledge for one
verbatra surface: the CLI, the stdio MCP server, or the Studio dashboard. They are written for the
things an agent gets wrong when it is only shown a command list: that a translate run bills a
provider the moment it starts and has no confirmation prompt, that API keys exist only as
environment variables, that `prune` deletes target keys from a config field rather than a flag,
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
`packages/studio/src/webmcp/register-tools.ts`. It runs on every push and pull request here, on a
nightly schedule so that a change made only in the source repository is still caught, and on a
`repository_dispatch` so a release can trigger it directly.

A second workflow, [validate](./.github/workflows/validate.yml), runs offline on every push and
pull request: it checks the frontmatter, the naming rules, the file modes, the house style, and
that this README indexes exactly the skills that exist, then asks the real installer to resolve
the repository and confirms it finds every skill and nothing else.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for how to add a skill, the parity rule and why it
exists, and how to run both checks locally against a checkout of the source repository.

## License

[MIT](./LICENSE)
