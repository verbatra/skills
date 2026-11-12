## What changed

Describe the change and why it is needed.

Closes #

## How it was tested

Commands you ran and cases you covered. If a skill changed, say how you
exercised it in a real agent.

## Checklist

- [ ] Commits follow Conventional Commits
- [ ] `npm run validate` and `npm test` pass locally
- [ ] `npm run test:parity` passes against a current `verbatra/verbatra` checkout if a skill table changed
- [ ] Any new `uses:` reference is pinned to a full commit SHA
- [ ] Breaking change: this renames or removes a skill, drops coverage an agent relied on, or changes a shared safety rule, and the description above says what a consumer pinned to the previous tag must change
- [ ] This belongs here, not in the [main repository](https://github.com/verbatra/verbatra)
