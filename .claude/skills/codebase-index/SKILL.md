---
name: codebase-index
description: Builds and maintains a compact, token-cheap map of a codebase in .claude/codebase-index/ so Claude can re-orient from the map plus a list of changed files instead of re-reading the whole project. Use this skill at the start of any coding session in a project, after the conversation has been compacted or summarized, whenever you need to understand project structure or find where something lives, and whenever the user says "index the codebase", "update the index", "refresh the map", or complains that Claude keeps re-reading files. If .claude/codebase-index/INDEX.md exists in the project, use this skill before exploring the code with Glob, Grep, or Read.
---

# Codebase Index

Claude loses file contents between sessions and when long conversations are compacted, so it tends to re-read the whole codebase to get its bearings. That is the expensive part. This skill replaces it with two cheap steps: read a short map of the project, then re-read only the files that changed since the map was last updated.

The index is a map, not a copy. It tells you where things are and how they connect so you can go straight to the right file. When you need the actual code (to edit it, debug it, or quote it), open the file.

## Files

Everything lives in `<project-root>/.claude/codebase-index/`:

- `INDEX.md`: the map. Always read this first.
- `areas/<area>.md`: per-area detail, only for larger projects (see "Layout").
- `manifest.json`: fingerprints of every indexed file, written by the script. Never edit by hand.
- `ignore` (optional): extra glob patterns to leave out, one per line.

The change-detection script is `scripts/index_status.py` inside this skill's folder. Run it with `python3 <skill-dir>/scripts/index_status.py <command>` from anywhere in the project:

- `list`: every file that belongs in the index, with line counts and a suggested layout.
- `status`: which files were added, modified, or deleted since the last snapshot. Prints `NO_INDEX`, `UP_TO_DATE`, or `CHANGED` on the first line.
- `snapshot`: records the current state. Run it every time you finish updating the index.

The script already skips dependencies, build output, lockfiles, binaries, secrets (`.env`, keys), and the `.claude/` folder, and it respects `.gitignore` in git repos.

## Workflow

### 1. Orient (start of session, or after compaction)

1. Run `status`.
2. If it prints `NO_INDEX`, go to "Build the index" (ask the user first if the project is large, because the first build reads everything once).
3. Otherwise read `INDEX.md`. If the project uses `areas/`, read only the area files relevant to the task.
4. If it prints `CHANGED`, go to "Refresh". If `UP_TO_DATE`, the map is accurate. Start the task.

Do not run broad Glob/Grep sweeps or read files "to get familiar" once you have the map. Open a file when the task needs its contents. That restraint is the whole point of the skill.

### 2. Build the index (first time)

1. Run `list` to see the files and the suggested layout.
2. Read the files. Prioritize entry points, config (`package.json`, `tsconfig.json`, or the equivalent for the language), and the main source folders. Skim tests only for what they reveal about behaviour.
3. Write `INDEX.md` (and `areas/*.md` if splitting) using the format below.
4. Run `snapshot`.
5. Add the pointer to `CLAUDE.md` (see "CLAUDE.md pointer") if it is not already there.
6. Tell the user how many files were indexed and suggest committing `.claude/codebase-index/` so the index is shared and survives across machines.

### 3. Refresh (files changed)

1. For each `ADDED` or `MODIFIED` file: read it, then add or rewrite its entry.
2. For each `DELETED` file: remove its entry and any references to it in other entries.
3. If the changes affect the overview (a new area, a new entry point, a changed data flow), update the overview section too.
4. Run `snapshot`.

If more than about 40% of files changed, a full rebuild is usually simpler than a refresh.

### 4. Keep it current while you work

Before you finish a task in which you created, edited, or deleted files, update their entries and run `snapshot`. You just wrote those files, so this costs very little, and it means the next session starts `UP_TO_DATE` instead of re-reading your own changes.

## Index format

Keep entries terse. The index should be a small fraction of the code's size. Describe what something does and how it connects, not how it is implemented. Line-by-line detail belongs in the code.

`INDEX.md` starts with an overview:

```markdown
# <Project name> index

## Overview
- Purpose: <one or two sentences on what the project does>
- Stack: <language, framework, runtime, key libraries>
- Entry points: <files where execution starts: server, CLI, app root>
- Commands: <build / test / dev commands from package.json or equivalent>
- Conventions: <naming, folder rules, patterns a newcomer must follow>

## Structure
- `src/api/`: HTTP route handlers, one file per resource
- `src/db/`: database client and queries
- ...

## Key flows
- <Request lifecycle, auth flow, data pipeline: the 2–5 paths through the code that matter most, as short arrows between files>
```

Then one entry per file:

```markdown
### src/auth/session.ts
Purpose: Creates and validates login sessions stored in Redis.
Exports: createSession(userId) → Session; verifySession(token) → Session | null; SESSION_TTL
Uses: src/db/redis.ts, src/config.ts
Used by: src/api/login.ts, src/middleware/requireAuth.ts
Notes: Tokens are opaque random strings, not JWTs.
```

Leave out `Notes` unless there is something a future reader would get wrong. Small, obvious files (barrel `index.ts` re-exports, type-only files, trivial config) can share one line in a grouped entry, for example `src/types/*.ts: shared TypeScript types for API payloads`.

## Layout

- Up to about 150 indexable files: everything in one `INDEX.md`.
- More than that: `INDEX.md` holds the overview, the structure list, key flows, and a table of areas with links. Each area (usually a top-level source folder, or a package in a monorepo) gets `areas/<area>.md` holding its file entries. This way a task in one area only loads that area's file.

The `list` command prints the suggested layout. Use your judgment if the project's natural boundaries differ from its top-level folders.

## CLAUDE.md pointer

Add this to the project's `CLAUDE.md` (create the file if it does not exist). Keep it short, because `CLAUDE.md` is loaded into every session:

```markdown
## Codebase index
This project has a map at `.claude/codebase-index/INDEX.md`. Use the codebase-index skill to check it is current and read it before exploring the code; open individual files only when the task needs their contents.
```

## When the user wants to exclude things

Add glob patterns to `.claude/codebase-index/ignore` (for example `src/generated/` or `*.fixture.ts`), run `status`, remove entries for files that are now excluded, then run `snapshot`.
