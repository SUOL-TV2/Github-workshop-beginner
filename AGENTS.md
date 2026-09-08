# AGENTS.md

This repository is a workshop for GitHub Copilot customization, agent workflows, and evaluation. It mixes workshop content, custom agents/skills, and a small TypeScript evaluator project.

## Repository map

- [README.md](README.md) — overview of the workshop and repository purpose.
- [src/DESCRIPTION.md](src/DESCRIPTION.md), [src/FUNCTIONAL_REQUIREMENTS.md](src/FUNCTIONAL_REQUIREMENTS.md), and [src/TECHNICAL_REQUIREMENTS.md](src/TECHNICAL_REQUIREMENTS.md) — product and technical requirements for the McSquishy game.
- [exercises/](exercises/) — Stage One and Stage Two workshop activities.
- [docs/](docs/) — reference docs for customization, skills, agents, and orchestration.
- [evaluator/](evaluator/) — TypeScript utility that evaluates agent/skill definitions and emits scores/badges.
- [.agents/](.agents/) and [.github/](.github/) — custom prompts, skills, hooks, and workflows used in the workshop.

## Working conventions

- Prefer small, focused changes. This repo is instructional and intentionally modular.
- Keep customizations minimal and actionable; link to existing docs instead of duplicating them.
- For workshop tasks, do not invent product behavior beyond the written requirements. When requirements are missing or ambiguous, note the gap clearly and avoid guessing.
- When working on the evaluator project, keep TypeScript code clean and testable.

## Key commands

From [evaluator/package.json](evaluator/package.json):

- `cd evaluator && npm test` — run the test suite.
- `cd evaluator && npm run typecheck` — check TypeScript compilation without emitting files.
- `cd evaluator && npm run build` — compile the project.
- `cd evaluator && npm run cli -- --help` — inspect CLI usage.

These are the expected local validation commands for code in the evaluator.

## Project-specific guidance

- The workshop is about GitHub Copilot customization patterns, not production app delivery. Keep edits aligned to exercises, prompts, skills, agents, and docs.
- The game requirements in [src](src) are intentionally browser-only and local-first; do not introduce cloud dependencies or external backend requirements.
- Use the existing docs as the source of truth for customization behavior and link to them rather than copying large sections.
- When a task mentions converting requirements into backlog or issues, use the repo skill at [.agents/skills/description-to-github-issues/SKILL.md](.agents/skills/description-to-github-issues/SKILL.md) as the working pattern.

## Useful references

- [README.md](README.md)
- [docs/copilot-customization.md](docs/copilot-customization.md)
- [docs/skills.md](docs/skills.md)
- [docs/custom-agents.md](docs/custom-agents.md)
- [docs/agent-orchestration.md](docs/agent-orchestration.md)
- [docs/evaluator.md](docs/evaluator.md)

## Quality bar for AI agents

- Keep instructions concise, specific, and project-aware.
- Prefer direct links to files and docs over embedding long copied content.
- Make sure changes are consistent with the repo’s workshop purpose and the TypeScript tooling already in place.

## Execution guardrails

- Treat this repository as a workshop and customization lab, not a production application codebase.
- Use the requirements in [src](src) as the source of truth; do not invent missing game behavior or backend requirements.
- Prefer small, reversible edits and avoid duplicating existing documentation.
- For evaluator or validation changes, run `cd evaluator && npm test` and `cd evaluator && npm run typecheck` before considering the work complete.
- If a task is ambiguous or a requirement is missing, document the gap clearly instead of guessing.
- Link to the existing docs in [docs](docs) rather than embedding large copied sections.
- When the task involves creating backlog items or issues, follow the pattern in [.agents/skills/description-to-github-issues/SKILL.md](.agents/skills/description-to-github-issues/SKILL.md).
