<h1 align="center">verbatra skills</h1>

<p align="center">
  Agent skills for <a href="https://github.com/verbatra/verbatra">verbatra</a>, the i18n translation automation tool.
</p>

<p align="center">
  <a href="https://github.com/verbatra/skills/actions/workflows/validate.yml"><img src="https://img.shields.io/github/actions/workflow/status/verbatra/skills/validate.yml?branch=main&label=validate&color=7b1fa2&labelColor=0B0B12" alt="Validate" /></a>
  <a href="https://github.com/verbatra/skills/actions/workflows/parity.yml"><img src="https://img.shields.io/github/actions/workflow/status/verbatra/skills/parity.yml?branch=main&label=parity&color=7b1fa2&labelColor=0B0B12" alt="Tool parity" /></a>
  <a href="https://www.npmjs.com/package/@verbatra/cli"><img src="https://img.shields.io/npm/v/%40verbatra%2Fcli?label=%40verbatra%2Fcli&color=7b1fa2&labelColor=0B0B12" alt="@verbatra/cli on npm" /></a>
  <a href="https://skills.sh/verbatra/skills"><img src="https://skills.sh/b/verbatra/skills" alt="verbatra/skills on skills.sh" /></a>
  <a href="https://scorecard.dev/viewer/?uri=github.com/verbatra/skills"><img src="https://img.shields.io/ossf-scorecard/github.com/verbatra/skills?label=openssf%20scorecard&labelColor=0B0B12" alt="OpenSSF Scorecard" /></a>
  <a href="./LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg?color=7b1fa2&labelColor=0B0B12" alt="License: MIT" /></a>
</p>

verbatra keeps an app's locale files in sync and translates what is missing with an LLM or a
machine-translation provider. A coding agent can drive all of it, and that is the risk: one
`translate` call bills the provider with no prompt, a locale file can carry text written to look
like an order, and a config field can delete keys without a flag.

These skills give the agent the operating judgement a command list leaves out: what to run first,
what costs money, what a result really means, and what never to do. Every table they hold is
checked against verbatra's source code on every change and every night, so a renamed command,
format or tool turns a check red here instead of reaching your agent.

## Which skill

Pick by what the agent is holding. Install all three: each one loads only when its surface is in
play.

| The agent is holding | Skill | It covers |
| --- | --- | --- |
| A shell or a CI job | [verbatra-cli](./skills/verbatra-cli/SKILL.md) | What each command costs and writes, the read-only questions to ask before a run, exit codes and the JSON envelope, setup with `verbatra init` |
| MCP tools with dotted names such as `status.check` | [verbatra-mcp-tools](./skills/verbatra-mcp-tools/SKILL.md) | The stdio MCP server's tools, the spend boundary that keeps provider tools off the default list, values-redacted mode |
| Browser tools named `verbatra_...` in an open Studio tab | [verbatra-studio-agent-tools](./skills/verbatra-studio-agent-tools/SKILL.md) | The Studio dashboard's WebMCP tools, the two operator gates in front of them, and how their results differ from the stdio server's |

## Install

Pick one route per agent. Installing both the plugin and the skills gives every skill twice.

**Claude Code: the plugin.** Run it from the root of the project that holds your verbatra
config. It brings the three skills, the verbatra MCP server with spending off, and a hook that
checks locale files Claude edits ([details](#claude-code-plugin)):

```bash
claude plugin marketplace add verbatra/skills
claude plugin install verbatra@verbatra -s project
```

Update with `claude plugin update verbatra@verbatra -s project`, then restart Claude Code.

**Any agent: the skills alone**, through the [skills](https://skills.sh) installer:

```bash
npx skills@latest add verbatra/skills --skill '*' -a claude-code -y
```

Swap `claude-code` for the installer's id of your agent, such as `codex`, `cursor` or
`gemini-cli`, or leave `-a` out to choose interactively. Repeat
`--skill <name>` instead of `'*'` to take a subset, add `-g` to install for your user rather than
the project, and `--copy` for editable copies instead of symlinks. Update with
`npx skills@latest update`.

### Pinning a version

A bare `verbatra/skills` tracks the default branch. A `#` fragment pins it:

| Ref after `#` | What you get |
| --- | --- |
| a tag, such as `v0.2.0` | frozen at the tagged commit; the pin to prefer |
| a full 40-character commit SHA | frozen at that commit |
| a branch name | that branch's tip, re-resolved on every install |
| an abbreviated commit SHA | nothing: the install fails |

```bash
npx skills@latest add verbatra/skills#v0.2.0 --skill verbatra-cli -a claude-code -y
```

The installer tries a ref as a branch or a tag first and fetches a bare commit only for a full
40-character SHA, so a short SHA fails with
`fatal: Remote branch <sha> not found in upstream origin`.

## What the skills make an agent do

- **Ask before it spends.** A translate run bills the moment it starts. The agent reads what is
  pending, prices it, reports both, and waits for an explicit yes.
- **Leave keys in the environment.** verbatra reads provider keys only from environment
  variables, so the agent names the variable and lets you fill it in. It never asks for the value.
- **Treat strings as data.** Every source string, translation, glossary term and translator
  comment is untrusted input to report, never an instruction to follow.
- **Respect `prune`.** It is a config field as well as a flag, so an ordinary run can delete
  orphaned keys. The agent says what the project's setting is before it runs.
- **Read results honestly.** It branches on exit codes and error codes, not on `ok` or on prose,
  and reports what landed and what stayed behind.

## What is covered, and what is not

The skills cover deciding what to run on the CLI, the stdio MCP server and the Studio browser
tools; the spend boundary; reading exit codes, error codes, notices and review reasons; and the
registries an agent branches on. They leave the SDK reference, the documentation site's guides,
and setting up a project's i18n library to the
[documentation site](https://verbatra.kreitz-webdev.de/docs). [SCOPE.md](./SCOPE.md) draws the
line in full.

## How they stay correct

A skills pack is prose an agent trusts, and prose rots the first time the tool changes. So every
table that lists a real surface (commands, formats, providers and their key variables, doctor
checks, error and notice codes, MCP tools, Studio tools), and every count spelled out in the
prose, is asserted against the registries in
[verbatra/verbatra](https://github.com/verbatra/verbatra) by the
[parity workflow](./.github/workflows/parity.yml). It runs on every pull request, nightly, and on
demand from verbatra's own release workflow, so a change made only in the source repository still
turns this one red. [CONTRIBUTING.md](./CONTRIBUTING.md#the-parity-rule) maps each table to the
code it is checked against.

A second workflow, [validate](./.github/workflows/validate.yml), checks the frontmatter, naming,
links, house style and README index offline, then asks the real installer to resolve the
repository and confirms it finds every skill and nothing else.

## Claude Code plugin

What the plugin adds:

- **The three skills**, exactly as listed above.
- **The verbatra MCP server**, `npx -y @verbatra/mcp@<version> --cwd <project>`, over the
  project Claude Code has open. The version is pinned in [`.mcp.json`](./.mcp.json). Without a
  usable verbatra config the server still starts, but only `project.snapshot` and
  `project.doctor` work: run `npx @verbatra/cli init` there, and the next tool call picks the
  config up without a restart. It reads provider keys from the environment Claude Code runs in;
  the plugin has no key option and never should.
- **Spending off by default.** The tools that call a translation provider are not listed until
  you set the plugin's `allowSpend` option, which reaches the server as
  `VERBATRA_MCP_ALLOW_SPEND`:
  `claude plugin install verbatra@verbatra -s project --config allowSpend=true`. Claude Code keeps
  plugin options in your user settings and ignores them in a project's committed settings, so a
  repository cannot switch spending on for you. A project whose provider is `none` never lists
  those tools.
- **A locale-edit hook.** After Claude edits or writes a file that matches the config's
  `files.pattern`, the hook runs `verbatra check --file <path> --severity error --json` on that
  file and hands any finding back to Claude to fix: a file that no longer parses (JSON and YAML
  errors come with line and column), or a translation that breaks a placeholder, inline markup or
  ICU. With a CLI that does not know `--file`, it falls back to
  `verbatra check --qa --severity error --json` and reports the edited locale's findings. It uses
  only the `@verbatra/cli` 0.12.0 or later in the project's `node_modules`, never downloads
  anything, calls no provider, reads no key, skips lockfiles, CI files and tool configs, and
  stays silent for every other file and in a project without a local verbatra.

Use the plugin instead of a `verbatra` entry in `.mcp.json` (the one `verbatra init --agent` or
`claude mcp add` writes), never both: together they register the server twice. If `.mcp.json`
already names a `verbatra` server, remove that entry first, or install the skills alone. Once
the plugin is enabled in `.claude/settings.json` or `.claude/settings.local.json`,
`verbatra init --agent` leaves `.mcp.json` alone, but it never removes an entry already there.

Project scope (`-s project`) is recommended because the server only does useful work where a
verbatra config exists: the plugin is recorded in the project's `.claude/settings.json`, enabled
for everyone who opens the project, and not started in every other project. Inside a session,
`/plugin marketplace add verbatra/skills` and `/plugin install verbatra@verbatra` work too.

The plugin carries no `version` field, so every commit on `main` reaches it as an update.

## Contributing

[CONTRIBUTING.md](./CONTRIBUTING.md) covers how a skill is written, the parity rule, and how to
run every check locally against a checkout of the source repository. Security reports go through
[SECURITY.md](./SECURITY.md).

## License

[MIT](./LICENSE)
