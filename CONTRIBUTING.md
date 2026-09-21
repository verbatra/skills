# Contributing

This repository holds verbatra's own agent skills and nothing else. It is the only home for them;
they used to live in `verbatra/verbatra` and no longer do.

Requirements: Node.js `>=22.14.0` and `npm ci` once.

## Adding a skill

1. Create `skills/<name>/SKILL.md`. **The directory name is the skill name.** The frontmatter
   `name` must be byte-identical to the directory name, because that is what `--skill <name>`
   matches and what the validator asserts.
2. Write the frontmatter:

   ```yaml
   ---
   name: verbatra-example
   description: One sentence on what the skill does, then the trigger conditions ("Use when ..."), then what it covers.
   license: MIT
   metadata:
     source: 'https://github.com/verbatra/skills'
     homepage: 'https://verbatra.kreitz-webdev.de'
   ---
   ```

   `name` must match `/^[a-z0-9]+(?:-[a-z0-9]+)*$/` and be at most 64 characters. `description` is
   what an agent reads to decide whether to load the skill, so it carries the trigger conditions,
   not just a label; it is capped at 1024 characters. `metadata.source` always points at this
   repository.
3. Add the bullet to the `## Skills` section of `README.md`. The validator fails if a skill is
   missing from the index, and fails if the index names a skill that does not exist.
4. If the skill enumerates a real surface (commands, formats, providers, tool names, RPC methods),
   add the matching assertions to `scripts/verify-tool-parity.test.mjs`. See the next section.
5. Run both checks locally (see "Running the checks").

House rules, enforced by the validator: English only, no emoji, and the em dash character U+2014
must never appear. Use a spaced hyphen, a colon, or parentheses instead. Tracked files must be
ordinary files; a symlink or a submodule cannot be installed by the skills CLI and is rejected.

## The parity rule

**A table in a skill that lists a real surface is asserted against the code that defines that
surface.** `scripts/verify-tool-parity.test.mjs` reads the registries in `verbatra/verbatra` and
compares them to the tables and the spelled-out counts in the three skill documents:

| Skill claim | Source of truth in `verbatra/verbatra` |
| --- | --- |
| `## Commands` table in `verbatra-cli` | `.command("...")` registrations in `packages/cli/src/run.ts` |
| `## Formats` table in `verbatra-cli` | `SUPPORTED_FORMATS` in `packages/core/src/model/supported-format.ts` |
| `## Providers` first column in `verbatra-cli` | `providerFactories` in `packages/sdk/src/config/provider-config.ts` |
| `## Providers` second column in `verbatra-cli` | `PROVIDER_ENV` and `OPENAI_COMPATIBLE_ENV_VAR` in `packages/ai-providers/src/env.ts` |
| `## Tools` table in `verbatra-mcp-tools` | `ALL_TOOLS_IN_ORDER` and `SPEND_TOOL_NAMES` in `packages/mcp/src/tools/registry.ts`, cross-checked against every `name:` declared under `packages/mcp/src/tools/` |
| `## Tools` table in `verbatra-studio-agent-tools` | `rpcParamsSchemas` in `packages/studio/src/shared/rpc/contract.ts`, the `*_METHOD` constants beside it, and the `spendGated` descriptors in `packages/studio/src/webmcp/register-tools.ts` |
| Counts spelled out in prose ("one of these fourteen", "registers ... but advertises only ...") | derived from the same registries, never remembered |

Why it exists: a skills pack is prose an agent trusts. Without a guard, the first renamed tool or
added format turns that prose into confident, wrong instructions, and nothing fails. The guard is
the reason the pack is worth shipping at all.

Because the source of truth is in another repository, the failure is now post-hoc: a change in
`verbatra/verbatra` that renames a tool merges green there and turns this repository red
afterwards. That is what the nightly schedule and the `repository_dispatch` trigger are for. When
you add a command, a format, a provider, a tool or an RPC method over there, update the matching
table here in the same working session.

## Running the checks

Install once:

```bash
npm ci
```

The offline checks, which are what `validate.yml` runs:

```bash
npm run validate   # frontmatter, naming, file modes, house style, README index parity
npm test           # the validator's own fixture suite, one fixture per rule
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

## Releases

There is no release flow and no published package. The installer resolves a git ref, so the
"release" of a skill is the commit on `main`, and a consumer who wants a fixed version pins one
with the `#` fragment (`verbatra/skills#<sha>`). If a versioned changelog is ever wanted, the way
to add it is changesets with a private root `package.json`: `npx changeset` per change, a version
pull request, and `npx changeset tag` to cut the git tag that consumers would then pin. Nothing in
the current layout blocks that; it is deliberately not set up, because three skills with no
published artifact do not yet earn the ceremony.

## Commits and pull requests

Conventional Commits, for example `feat(verbatra-cli): document the extract command` or
`fix(parity): follow the renamed rpc contract`. `main` is protected by the two workflows; every
change after the initial scaffold goes through a pull request.
