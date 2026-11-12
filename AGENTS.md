This repository holds verbatra's own agent skills and nothing else. The source of truth for what they describe is `verbatra/verbatra`; skills follow source, never the reverse. Before you change a skill, read the code it describes there, not the skill's current text.

Each skill is a folder under `skills/<name>/`, and the folder name equals the frontmatter `name`. The names `verbatra-cli`, `verbatra-mcp-tools` and `verbatra-studio-agent-tools` are installed by users and vendored by `verbatra/verbatra`: never rename one.

- `SKILL.md` is a lean entry of 200 lines at most, with the fixed sections `## Which surface`, `## Non-negotiable rules`, `## Decision flow` (every step ends on a **Done when:**), `## Done when`, `## Where the depth lives` and `## Reference`, in that order. `CONTRIBUTING.md` ("Writing a skill") explains each one.
- Depth lives in flat sibling `.md` files in the same folder, each opening with a "Read this when ..." sentence, linked from the entry. A sibling over 100 lines opens with a table of contents.
- `agents/openai.yaml` gives each skill an `interface` with `display_name` and `short_description`.
- A `description` is one line of trigger conditions ("Use when ..."), 500 characters at most, naming at most two real commands or tools.
- One owner per fact within a skill; never link into another skill's folder, since each skill installs alone.

Every table that lists a real surface, and every count spelled out in prose, is asserted against the source repository by `scripts/verify-tool-parity.test.mjs`. When you move a table or a pinned sentence, re-point the test in the same commit and prove the guard still bites by breaking one row.

The five shared safety rules are repeated verbatim in each `SKILL.md` and asserted by the parity suite. Change them everywhere or nowhere, and never weaken them.

`SCOPE.md` states what the skills cover and what they leave to the docs site; check a new addition against it.

Checks: `npm run validate`, `npm test`, `npm run check:discovery` (needs network), and `SOURCE_ROOT=<verbatra checkout> npm run test:parity`. `git add` new files before `npm run validate`: its house-style scan reads only files in the git index. See `CONTRIBUTING.md` for the release checklist.

The pinned `@verbatra/mcp` version in `.mcp.json` must equal the `version` in `packages/mcp/package.json` at the source ref the parity suite runs against. On a release-prep branch it is set to the pending release, so that one test fails until that version is published, then goes green.

No em dashes (U+2014) and no emoji anywhere in this repo. Rewrite the sentence with a colon, comma, parentheses or a spaced hyphen. English only.

Commits are Conventional Commits with a short title and no body. Work on `updates/new`; `main` is the release branch.
