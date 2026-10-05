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
npx skills@latest add verbatra/skills --skill verbatra-cli -a claude-code -y
```

Swap `claude-code` for your agent's id. The slugs are `verbatra-cli`, `verbatra-mcp-tools` and
`verbatra-studio-agent-tools`; repeat `--skill` to pick a subset, or pass `--skill '*'` with the
same `-a claude-code -y` to install all three. Add `-g` to install for your user instead of the
current project. The install writes the skill into your agent directory and records a row in
your own `skills-lock.json`.

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

## Claude Code plugin

In Claude Code, one install brings the three skills, the verbatra MCP server and a
hook that checks edited locale files:

Use the plugin instead of a `verbatra` entry in `.mcp.json` (the one `verbatra init --agent` or
`claude mcp add` writes), never both: the plugin bundles its own copy of the server, so together
they register it twice. If the project's `.mcp.json` already names a `verbatra` server, remove
that entry before installing the plugin, or skip the plugin and install the skills alone as
shown above.

Install it into the project that holds your verbatra config, from that project's root:

```bash
claude plugin marketplace add verbatra/skills
claude plugin install verbatra@verbatra -s project
```

Project scope is the recommended one because the MCP server only does useful work in
a project that has a verbatra config: `-s project` records the plugin in the project's
`.claude/settings.json`, so it is enabled where it works and for everyone who opens
the project, instead of starting a server in every other project that can only report
the missing config. Inside
a Claude Code session, `/plugin marketplace add verbatra/skills` and
`/plugin install verbatra@verbatra` work too; the shell commands above make the
scope explicit.

What the plugin adds:

- **The skills**: `verbatra-cli`, `verbatra-mcp-tools` and
  `verbatra-studio-agent-tools`, exactly as listed below.
- **The MCP server** `verbatra`: `npx -y @verbatra/mcp@<version> --cwd <project>`,
  run over the project Claude Code has open. The version is pinned in
  [`.mcp.json`](./.mcp.json), and the parity workflow fails whenever the pin differs
  from the `@verbatra/mcp` version in the source repository. Without a usable verbatra config
  in the project it still starts, but only `project.snapshot` and `project.doctor`
  work: run `npx verbatra init` there, and the next tool call picks the config up
  without a restart. It reads a provider API key from
  the environment Claude Code runs in; the plugin has no key option and never
  should.
- **Spending off by default.** The tools that call a translation provider and bill
  it are not listed until you set the plugin's `allowSpend` option, which the
  plugin passes to the server as `VERBATRA_MCP_ALLOW_SPEND`:
  `claude plugin install verbatra@verbatra -s project --config allowSpend=true`.
  Claude Code keeps plugin options in your user settings and ignores them in a
  project's committed settings, so a repository cannot switch spending on for you.
  Turn it on only if you want an agent to be able to spend. A project whose provider is
  `none` never lists those tools, whatever the option says.
- **A locale-edit hook.** After Claude edits or writes a file that matches the
  config's `files.pattern`, the hook runs the project's own
  `verbatra check --file <path> --severity error --json` on that one file and,
  when the file no longer parses or a translation in it breaks a placeholder,
  inline markup or ICU, hands the findings back to Claude so it fixes them before
  moving on; a JSON or YAML syntax error comes with its line and column. With a
  CLI that does not know `--file` yet, it falls back to
  `verbatra check --qa --severity error --json` over the whole project and
  reports the edited locale's findings. Lockfiles, CI files and tool configs are
  skipped without running anything. It uses only
  the `@verbatra/cli` installed in the project's `node_modules` (0.12.0 or later),
  never downloads anything, calls no provider, reads no key, and stays silent for
  every other file and in a project without a local verbatra.

The plugin carries no `version` field, so every commit on `main` is an update.
The skills-only install in the previous section keeps working and needs neither
the MCP server nor the hook; it is the route to take next to a `.mcp.json` entry.

## Skills

- **[verbatra-cli](./skills/verbatra-cli/SKILL.md)**: Drive the verbatra i18n CLI from a shell or CI. Covers every command the binary registers, which of them cost money, the exit codes, the JSON envelope, the supported formats and providers, and what `verbatra.lock.json` means.
- **[verbatra-mcp-tools](./skills/verbatra-mcp-tools/SKILL.md)**: Operate a verbatra project through the verbatra stdio MCP server. Covers every registered tool, the spend boundary that keeps the provider-spending tools off the default tool list, how to work a status check into an edit, and what each result actually means.
- **[verbatra-studio-agent-tools](./skills/verbatra-studio-agent-tools/SKILL.md)**: Operate a verbatra project from an open Verbatra Studio dashboard tab through its WebMCP browser tools. Covers the tool set, the two gates that decide which tools register, how its tool set differs from the stdio server's, and the traps specific to driving a browser tab.

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
`packages/sdk/src/config/provider-config.ts`, `packages/ai-providers/src/key-env-vars.ts`,
`packages/mcp/src/tools/`, `packages/mcp/src/bin.ts`, `packages/mcp/package.json`,
`packages/studio/src/shared/rpc/` and `packages/studio/src/webmcp/register-tools.ts`. The
same suite asserts the plugin: the pinned `@verbatra/mcp` version against the last
release, the server flags and the spend variable against the server's own entry point,
and the hook's `check` options against the CLI. It runs on every push to `main` and every pull
request targeting `main`, on a nightly schedule so that a change made only in the source
repository is still caught, and on a `workflow_dispatch` that takes the source ref to assert
against, which the source repository's release workflow also calls so a release is checked at
once.

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
