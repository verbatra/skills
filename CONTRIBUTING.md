# Contributing

This repository holds verbatra's own agent skills and nothing else. It is the only home for them;
they used to live in `verbatra/verbatra` and no longer do.

Requirements: Node.js `^22.22.0 || >=24` and `npm ci` once.

## Writing a skill

A skill is operating guidance for one verbatra surface, not a manual. It tells an agent what to
run, in what order, what each answer means, and what never to do; the documentation site owns the
reference ([SCOPE.md](./SCOPE.md)).

**The entry, `SKILL.md`, has a fixed anatomy** (200 lines at most, asserted by the parity suite).
The validator requires these sections, in this order:

| Section | What it holds |
| --- | --- |
| Title and lead | One or two paragraphs: what the surface is and the one fact that makes it dangerous or different. |
| `## Which surface` | The three-row table that routes the agent to the right sibling skill. |
| `## Non-negotiable rules` | The five shared safety rules, verbatim, then any surface-specific guardrail. |
| `## Decision flow` | Numbered steps, each ending on a bold **Done when:** criterion the agent can check. |
| A surface section, optional | The one thing an agent misreads on this surface (exit codes, a missing tool, the gates). |
| `## Done when` | A checklist for the whole task: what must be true before the agent reports back. |
| `## Where the depth lives` | A table from task to sibling file. |
| `## Reference` | Links to the documentation pages that own the facts. |

**Depth goes into flat sibling files** (`COMMANDS.md`, `TOOLS.md`, and so on) in the same folder.
Each opens with its title and one "Read this when ..." sentence, has a table of contents when it
runs past 100 lines, and is linked from the entry; the validator checks the link and the table
of contents.

**Voice.** Second person, imperative, present tense. State the behaviour you want, and pair every
prohibition with the thing to do instead. Put a branch (several situations, several answers) in a
table or a list, never in a paragraph. Cut any sentence that does not change what the agent does.

**One owner per fact, within a skill.** Each fact lives in one file; every other file in that
skill gives it a pointer. Across skills, repeat what each one needs instead of linking another
skill's folder: a skill can be installed on its own, so a cross-folder link can dangle. The five
safety rules are the deliberate exception and are repeated verbatim in every entry.

## Adding a skill

1. Create `skills/<name>/SKILL.md`. **The directory name is the skill name.** The frontmatter
   `name` must be byte-identical to the directory name, because that is what `--skill <name>`
   matches and what the validator asserts.
2. Write the frontmatter:

   ```yaml
   ---
   name: verbatra-example
   description: <What it does>. Use when <triggers>. Also use when <secondary triggers>.
   license: MIT
   metadata:
     source: 'https://github.com/verbatra/skills'
     homepage: 'https://verbatra.kreitz-webdev.de'
   ---
   ```

   `name` must match `/^[a-z0-9]+(?:-[a-z0-9]+)*$/` and be at most 64 characters. `description` is
   what an agent reads to decide whether to load the skill, so it carries the trigger conditions,
   not just a label; it is capped at 500 characters by the validator
   (1024 is the installer's hard limit). `metadata.source` always points at this repository.

   **A description triggers loading; it does not index the surface.** Write one sentence on what
   the skill does, a "Use when ..." sentence with the trigger conditions, and, only when they
   exist, an "Also use when ..." sentence for the secondary ones (a missing tool, a refused
   action). Write each trigger in the words a user or a tool result would use, keep it on one
   line, and aim for about 300 characters. Do not list the commands, tool
   names or RPC methods: the body table already lists every one of them, the parity suite already
   asserts that table against the registry, and a second hand-kept copy in the frontmatter can
   only drift out of it. `scripts/verify-tool-parity.test.mjs` enforces this, allowing a
   description to anchor on at most two real identifiers before it counts as an enumeration.
3. Write the body to the anatomy above, and give the skill an `agents/openai.yaml` with
   `interface.display_name` and `interface.short_description`.
4. Add the row to the `## Which skill` table of `README.md`, and to the `## Which surface` table
   of every entry. The validator fails if a skill is missing from the README, and fails if the
   README names a skill that does not exist.
5. If the skill enumerates a real surface (commands, formats, providers, tool names, RPC methods),
   add the matching assertions to `scripts/verify-tool-parity.test.mjs`. See the next section.
6. Run every check locally (see "Running the checks").

House rules, enforced by the validator: English only, no emoji, and the em dash character U+2014
must never appear. Use a spaced hyphen, a colon, or parentheses instead. Tracked files must be
ordinary files; a symlink or a submodule cannot be installed by the skills CLI and is rejected.
A `#` pin written into `README.md` or `CONTRIBUTING.md` must be a tag or a full 40-character
commit SHA; an abbreviated SHA is rejected, because the installer cannot resolve one (see
"Releases").

## The parity rule

**A table in a skill that lists a real surface is asserted against the code that defines that
surface.** `scripts/verify-tool-parity.test.mjs` reads the registries in `verbatra/verbatra` and
compares them to the tables and the spelled-out counts in the skill files:

| Skill claim | Source of truth in `verbatra/verbatra` |
| --- | --- |
| `## Commands` in `verbatra-cli/COMMANDS.md` | `.command("...")` registrations in `packages/cli/src/run.ts` |
| `## Formats` in `verbatra-cli/FORMATS.md` | `SUPPORTED_FORMATS` in `packages/core/src/model/supported-format.ts` |
| `## Providers`, first column, in `verbatra-cli/PROVIDERS.md` | the `id` literals of `providerConfigSchema` in `packages/sdk/src/config/provider-config.ts`, every one but `none` backed by `providerFactories` |
| `## Providers`, second column | `PROVIDER_ENV`, `OPENAI_COMPATIBLE_ENV_VAR` and `LIBRETRANSLATE_ENV_VAR` in `packages/ai-providers/src/key-env-vars.ts`; `none` names no variable |
| `## doctor` in `verbatra-cli/DOCTOR.md` | `"config"` then `CONFIG_DEPENDENT_IDS` in `packages/sdk/src/flow/doctor.ts`, in order; every other `DoctorCheckId` is a row of `### Checks that replace the setup run` under it |
| `## Error and notice codes` in `verbatra-cli/ERROR-CODES.md` | every `SdkErrorCode` in `packages/sdk/src/errors.ts`, once each; any other code must be in `CLI_ERROR_CODES` in `packages/cli/src/cli-error-codes.ts`, which that table and the failure table under `## Setting a project up` in `verbatra-cli/INIT.md` cover between them |
| `## Provider error codes` in `verbatra-cli/ERROR-CODES.md` | every member of `ProviderErrorCode` in `packages/ai-providers/src/errors.ts`, with its runtime `PROVIDER_ERROR_CODES` list, and each next step quoted verbatim from `PROVIDER_ERROR_HINTS` in `packages/sdk/src/error-hints.ts` |
| Notice code list in `verbatra-cli/ERROR-CODES.md` | `SdkNoticeCode` in `packages/sdk/src/flow/summary.ts` |
| `## Tools` in `verbatra-mcp-tools/TOOLS.md` | `ALL_TOOLS_IN_ORDER` and `SPEND_TOOL_NAMES` in `packages/mcp/src/tools/registry.ts`, cross-checked against every `name:` declared under `packages/mcp/src/tools/` |
| `## Tools` in `verbatra-studio-agent-tools/TOOLS.md` | `rpcParamsSchemas` in `packages/studio/src/shared/rpc/contract.ts` less `HUMAN_ONLY_METHOD_NAMES`, the `*_METHOD` constants beside it, and the `TOOL_DESCRIPTORS` (with their `spendGated` flag) in `packages/studio/src/webmcp/register-tools.ts`; every `HUMAN_ONLY_METHOD_NAMES` method is named under `## Two gates, not one` in `GATES.md` |
| The five safety rules in every `SKILL.md` | the block in the parity suite itself, compared with whitespace normalized |
| `.mcp.json` in the Claude Code plugin | the `version` in `packages/mcp/package.json`, and the flags and `ALLOW_SPEND_ENV_VAR` in `packages/mcp/src/bin.ts` (and `bin-args.ts` when present) |
| `checkArguments` and `fileCheckArguments` in `hooks/check-locale-edit.mjs` | the `check` command's `.option(...)` registrations in `packages/cli/src/run.ts` |
| Counts spelled out in prose ("one of these fourteen", "registers ... but advertises only ...") | derived from the same registries, never remembered |
| Frontmatter `description` in all three skills | the same registries, asserted negatively: a description must name at most two real identifiers (a bare command word such as "translate" counts), so it cannot grow back into a stale second index |

Why it exists: a skills pack is prose an agent trusts. Without a guard, the first renamed tool or
added format turns that prose into confident, wrong instructions, and nothing fails. The guard is
the reason the pack is worth shipping at all.

When you move a table or a pinned sentence, re-point the test in the same commit and prove the
guard still bites by breaking one row.

Because the source of truth is in another repository, the failure is now post-hoc: a change in
`verbatra/verbatra` that renames a tool merges green there and turns this repository red
afterwards. That is what the nightly schedule and the `workflow_dispatch` the source
repository's release workflow sends are for. When you add a command, a format, a provider, a tool
or an RPC method over there, update the matching table here in the same working session.

## Running the checks

Install once:

```bash
npm ci
```

The offline checks, which are what `validate.yml` runs:

```bash
npm run validate   # frontmatter, entry sections, naming, file modes, house style, pinned refs,
                   # README index, relative .md links, tables of contents over 100 lines
npm test           # the validator's fixture suite (one fixture per rule) and the hook's tests
```

The parity suite needs a checkout of `verbatra/verbatra`. It looks for a sibling directory named
`verbatra` by default, and `SOURCE_ROOT` overrides that with any path, absolute or relative to
this repository:

```bash
git clone --filter=blob:none https://github.com/verbatra/verbatra.git ../verbatra
npm run test:parity
```

```bash
SOURCE_ROOT=/path/to/your/verbatra npm run test:parity
```

If `SOURCE_ROOT` does not contain `packages/cli/src/run.ts`, the suite fails immediately with a
message naming the path it tried, rather than reporting a hundred missing-file errors.

The discovery check asks the real installer to resolve this repository and confirms it finds every
skill and nothing else. It needs network access, which is why it is a separate script rather than
part of the validator:

```bash
npm run check:discovery
```

To try an edited skill in a real project before it is merged, point the installer at your checkout:

```bash
npx skills@latest add /path/to/your/skills --skill verbatra-cli -a claude-code -y
```

## The Claude Code plugin

The repository root is also a Claude Code plugin marketplace
(`.claude-plugin/marketplace.json`) holding one plugin, `verbatra`, whose root is the
repository itself (`.claude-plugin/plugin.json`). It picks the skills up from the default
`skills/` directory, so a new skill ships in the plugin without a manifest change. The MCP
server is declared in `.mcp.json` and the hook in `hooks/hooks.json`, which runs
`hooks/check-locale-edit.mjs`.

- The pinned `@verbatra/mcp` version in `.mcp.json` must equal the `version` in
  `packages/mcp/package.json` at the source ref the parity suite runs against. On a release-prep
  branch the pin is the pending release, so that check fails until that version is published,
  then goes green. Never pin an older one, so the plugin never starts a server older than the
  skills describe.
- `npm test` covers the hook script with fixtures; it never needs a real verbatra.
- To try the hook by hand against a real project, install a `@verbatra/cli` that knows
  `check --file` in a project with a verbatra config and a German locale file, break a
  placeholder in that file (turn `{name}` into `{nom}`), and feed the hook the event Claude
  Code sends after an edit:

  ```bash
  echo '{"tool_name":"Edit","tool_input":{"file_path":"locales/de.json"},"cwd":"'"$PWD"'"}' \
    | CLAUDE_PROJECT_DIR="$PWD" node /path/to/skills/hooks/check-locale-edit.mjs; echo "exit $?"
  ```

  It prints the finding on stderr and exits `2`. Break the JSON itself (drop a comma) and it
  names the syntax error with its line and column; edit `src/app.ts` instead and it exits `0`
  at once without starting verbatra. In a Claude Code session with the plugin installed, ask
  Claude to make the same edit: the finding comes back to it as hook feedback.
- Validate the manifests with Claude Code itself:

  ```bash
  claude plugin validate .
  ```

  It passes with warnings, all expected: `plugin.json` has no `version`, deliberately, so that
  every commit on `main` reaches installed plugins as an update, which matches how this
  repository releases; `CLAUDE.md` at the plugin root is not loaded as project context, which is
  right, since it is for contributors; and the plugin directory checks note that there is no
  icon.
- Try a change before it merges by adding your checkout as a marketplace:
  `claude plugin marketplace add /path/to/your/skills`, then
  `claude plugin install verbatra@verbatra`.

## Releases

There is no release flow and no published package. The installer resolves a git ref, so the
"release" of a skill is a commit on `main`, and a consumer who wants a fixed version pins one with
the `#` fragment.

Two forms freeze, and one form that looks like it should does not:

- A **tag** freezes. It is the form to hand a reader, because it is short enough to survive a
  diff review: `verbatra/skills#v0.2.0`.
- A **full 40-character commit SHA** freezes, and is the form for a commit that was never tagged.
- An **abbreviated SHA fails outright**. The installer clones with
  `git clone --depth 1 --branch <ref>` and retries as a bare commit only when the ref matches
  `/^[0-9a-f]{40}$/i`, so a short SHA is tried as a branch name and the install dies with
  `fatal: Remote branch ... not found in upstream origin`. Never write one into a document here;
  `npm run validate` rejects a hex ref fragment that is not exactly 40 characters.

A branch name resolves, but it tracks that branch's tip rather than freezing, so it is not a pin.

### Release checklist

Skills that document an unreleased verbatra are prepared on a branch and promoted to `main` only
after that verbatra release is out:

1. Sync the skill tables and the plugin's `@verbatra/mcp` pin to the source branch that will be
   released. Against that branch the parity suite fails on exactly one test, the pin check, because
   `packages/mcp/package.json` still holds the previous version until the source repository's
   Version Packages pull request merges. That failure is the gate: it blocks promotion to `main`
   before the pinned server exists on npm.
2. Wait for the source release: the Version Packages pull request merged and `@verbatra/mcp`
   published at the pinned version.
3. Run `SOURCE_ROOT=<checkout of the released source> npm run test:parity`, `npm run validate`,
   `npm test`, `npm run check:discovery` and `claude plugin validate .`. Every one must pass
   before the branch reaches `main`.
4. Bump the pinned tag in `README.md` and `CONTRIBUTING.md` to the new release tag.
5. Merge to `main`, then re-vendor the three skills in `verbatra/verbatra`.

Cutting a tag is the whole release: `git tag v0.3.0 <commit> && git push origin v0.3.0`. If a
versioned changelog is ever wanted on top of that, the way to add it is changesets with a private
root `package.json`: `npx changeset` per change, a version pull request, and `npx changeset tag` to
cut the same git tag. Nothing in the current layout blocks that; it is deliberately not set up,
because three skills with no published artifact do not yet earn the ceremony.

## Commits and pull requests

Conventional Commits, for example `feat(verbatra-cli): document the extract command` or
`fix(parity): follow the renamed rpc contract`. `main` is protected by the two workflows; every
change after the initial scaffold goes through a pull request.

## Triage

Four more workflows keep issues and pull requests labelled, and none of them checks out or runs
code from a pull request. `pr-labels.yml` adds `scope:` labels from the changed paths in
`.github/labeler.yml` and a `type:` label (plus `breaking change` for a `!`) from the Conventional
Commit title. `issue-triage.yml` posts a fixed request when `needs reproduction` or `needs info` is
added, removes `needs triage` on close, and puts an issue back into `needs triage` when its author
replies. `stale.yml` marks only those two labels `stale` after 14 quiet days and closes the issue as
not planned 7 days later. `welcome.yml` greets a first issue and a first pull request.

Labels come in groups, the same here as in `verbatra/verbatra` and `verbatra/action`, so a
transferred issue keeps them: `type:` says what kind of work it is, `scope:` which area it touches,
`status:` where it stands, and `resolution:` why it was closed. The full list is on the
[labels page](https://github.com/verbatra/skills/labels); the source repository's
`scripts/sync-labels.sh verbatra/skills` keeps it in step.

When an issue arrives, or once a day from the `label:"needs triage"` filter:

1. A security problem reported in public: hide it, ask for a private advisory, and open a draft
   advisory yourself.
2. A question, or verbatra itself misbehaving while the skill describes it correctly: transfer it
   to `verbatra/verbatra`, where a question becomes a Discussion in Q&A.
3. A duplicate: link the original and close it as a duplicate with `resolution: duplicate`.
4. Check the `scope:` label (the forms set `scope: skills`).
5. A wrong skill: check the claim against the source, not the skill's text. If you cannot see the
   problem, add `needs reproduction` (the `Issue triage` workflow asks for one and the `Stale` timer
   starts); if the installed ref or the verbatra version is missing, first comment what is missing,
   then add `needs info`: the bot's message points at that comment. When the
   reporter replies, the issue goes back to `needs triage` on its own.
6. Confirmed or accepted: add `status: accepted` and remove `needs reproduction`, `needs info` and `stale` if they are set, plus `good first issue` or `help wanted` if it
   suits someone else.
7. Not doing it: add `resolution: wontfix` and close it as not planned with one sentence saying why.
8. Remove `needs triage`. The filter should be empty at the end.

For a pull request: check the labels the workflow set, approve the first workflow run of a
first-time contributor only after reading the diff, and confirm the parity suite ran if a table
changed.
