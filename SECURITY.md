# Security Policy

## Reporting a vulnerability

Please report security vulnerabilities through GitHub's private vulnerability
reporting: open the repository's Security tab and choose "Report a vulnerability"
(https://github.com/verbatra/skills/security/advisories/new). This keeps the
report private until a fix is available.

Do not open a public issue or pull request for a security vulnerability.

We aim to acknowledge a report within five business days, and we will keep you
informed as we investigate and work on a fix.

Report here if the issue is in this repository: a skill document that could lead
an agent into an unsafe action (for example running a provider-spending command
it was not asked to run, or exposing an API key), the validator and parity
scripts, or the workflows. If the issue is in verbatra itself, in `@verbatra/cli`,
`@verbatra/sdk`, `@verbatra/studio`, or `@verbatra/mcp`, report it against the
main project instead
(https://github.com/verbatra/verbatra/security/advisories/new), because that is
where a fix would ship.

## Supported versions

Security fixes land on `main` and ship in the next tag. A skill is installed from
a git ref, not from a package registry, so picking up a fix means reinstalling:
a bare `verbatra/skills` or a branch name picks it up on the next install, and a
tag or full commit SHA pin picks it up once you move the pin. This is stated
without version numbers on purpose: a numbered table goes stale the moment a tag
is cut.

## Supply-chain controls

Nothing in this repository is published to a package registry. The
`package.json` is marked private and carries devDependencies only, so this
repository has no publishing credentials to leak. The controls below are what
protect a consumer who installs a skill.

- **Release tags are immutable.** A repository ruleset blocks creating, moving,
  or deleting a `v*` tag for everyone but a repository administrator, so a tag
  pin keeps resolving to the commit it was cut from.
- **`main` only changes through a pull request** that passes the validator and
  the parity suite.
- **Every GitHub Action is pinned to a full commit SHA**, and the repository
  requires it: pinning is enforced by GitHub, not only by code review.
- **The lockfile is committed and CI installs are frozen** with `npm ci`.
- **Workflows default to a read-only token.** Every workflow declares
  `contents: read` at the top. The one write scope anywhere is
  `security-events: write`, confined to the job that uploads the OpenSSF
  Scorecard results to code scanning.
- **Dependabot runs weekly** over both the npm manifest and every Actions
  manifest, and CodeQL and OpenSSF Scorecard scan the repository.
- **Secret scanning and push protection are enabled** on this repository.

## Handling of API keys

The skills never ask an agent to put a provider API key in a config file, a
command-line argument, or a chat message. verbatra reads keys only from
environment variables, and the skills describe it that way. A skill that
instructs otherwise is a vulnerability; report it as described above.
