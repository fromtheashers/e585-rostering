# Project skills

Skills in this folder load automatically for every Claude Code session in this repo.

| Skill | Source | Upstream commit | License |
|---|---|---|---|
| `codebase-index` | Anthropic account skill `anthropic-skills:codebase-index` (SKILL.md only) | n/a | n/a |
| `emil-design-eng` | [emilkowalski/skills](https://github.com/emilkowalski/skills) `skills/emil-design-eng` | `2d22863` | MIT |
| `impeccable` | [pbakaus/impeccable](https://github.com/pbakaus/impeccable) `.claude/skills/impeccable` (v4.7.0) | `5cb95ee` | Apache 2.0 |
| `taste-skill` | [leonxlnx/taste-skill](https://github.com/leonxlnx/taste-skill) `skills/taste-skill` (evals left out) | `6010f91` | MIT |

Notes:
- Impeccable's four helper agents are in `.claude/agents/impeccable-*.md`.
- Impeccable's automatic hooks (upstream `.claude/settings.json`: SessionStart, PostToolUse, Stop) were deliberately **not** installed, so nothing runs unless a skill is invoked. Its `scripts/impeccable` launcher downloads a SHA-256-verified binary from the project's GitHub releases on first use.
- taste-skill's `scripts/*.mjs` need Node 22+ and Chrome/Chromium; `assets.mjs` fetches public-domain images from Openverse, Wikimedia, the Met and similar APIs.
- `codebase-index` refers to `scripts/index_status.py`, which was not included in the synced copy of the skill.

To update a skill, re-copy its folder from the upstream repo and bump the commit above.
