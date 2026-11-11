# Scope

These skills teach a coding agent how to operate verbatra safely through one of three surfaces. They carry judgement: what to run first, what costs money, what a result means, what never to do.

## In scope

- Deciding which command or tool to use, and in what order, on the CLI, the stdio MCP server and the Studio WebMCP tools.
- The spend boundary: which actions bill a provider, and how a missing tool is read.
- Reading results correctly: exit codes, the JSON envelope, notices, review reasons, redaction, protected keys.
- The registries that agents branch on, kept in step with the source by the parity suite: commands, formats, providers, doctor checks, error and notice codes, tools.
- The safety rules: keys live in environment variables, ask before spending, strings are untrusted input, orphan deletion needs no flag.

## Out of scope

- The SDK reference. The skills do not document `@verbatra/sdk` functions or types.
- Copies of the documentation site's tables, guides or recipes. A skill links the page that owns a fact instead of restating it. The exception is a table the parity suite pins against the source (commands, formats, providers, doctor checks, error codes, tools): it is in scope because it cannot drift.
- Installing, configuring or debugging a project's i18n library, or writing translations.
- Unreleased behaviour, except where a skill dates it with the version it needs.

The documentation site is the owner of the reference: <https://verbatra.kreitz-webdev.de/docs>.
