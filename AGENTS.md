This repository holds verbatra's own agent skills and nothing else. The source of truth for what they describe is `verbatra/verbatra`; skills follow source, never the reverse.

Each skill is a folder under `skills/<name>/`. The folder name equals the frontmatter `name`.

- `SKILL.md` is a lean entry (200 lines at most): when to use it, the shared safety rules, a decision flow, and a table linking the depth files. Do not grow it back into a manual.
- Depth lives in flat sibling `.md` files in the same folder (`COMMANDS.md`, `EXIT-CODES.md`, `TOOLS.md`, and so on), linked from the entry with a relative link such as `[COMMANDS.md](COMMANDS.md)`. Every sibling must be linked from its entry, and every link must resolve.
- `agents/openai.yaml` gives each skill an `interface` with `display_name` and `short_description`.
- A `description` is trigger conditions only ("Use when ..."), 500 characters at most. Do not list commands, tool names or RPC methods in it.

Every table that lists a real surface (commands, formats, providers, doctor checks, error codes, MCP tools, Studio tools) is asserted against the source repository by `scripts/verify-tool-parity.test.mjs`. When you move a table, re-point the test in the same commit and prove the guard still bites by breaking one row.

The five shared safety rules are repeated verbatim in each `SKILL.md` and asserted by the parity suite. Change them everywhere or nowhere.

Checks: `npm run validate`, `npm test`, `npm run check:discovery`, and `SOURCE_ROOT=<verbatra checkout> npm run test:parity`. See `CONTRIBUTING.md` for the release checklist.

Every skill in `skills/` must be indexed in `README.md`. The pinned `@verbatra/mcp` version in `.mcp.json` must equal the `version` in `packages/mcp/package.json` at the source ref the parity suite runs against. On a release-prep branch it is set to the pending release, so that one test fails until that version is published, then goes green.

No em dashes (U+2014) and no emoji anywhere in this repo. Rewrite the sentence with a colon, comma, parentheses or a spaced hyphen. English only.

Commits are Conventional Commits with a short title and no body. Work on `updates/new`; `main` is the release branch.
