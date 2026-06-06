---
name: coordn8-update
description: Push this node's progress to coordn8 — update its status in nodes/{id}.md, append logical progress to events/{id}.md, optionally raise asks at other nodes, then commit and push coordn8. Use whenever you've completed meaningful work on this node (finished a task, made progress, set a direction) so the rest of the system sees it.
---

# coordn8-update

Sync **to** coordn8 from this node. Run whenever you've done meaningful work. This is one half of the core loop; [`coordn8-refresh`](../coordn8-refresh/SKILL.md) is the other. Keeping this current is **mandatory** — it is the only way your work reaches coordn8, which can't see your commits.

## Resolve the basics first

1. **Find coordn8.** Read `~/.coordn8.json`; use the `coordn8` key (default `~/coordn8`). Call it `$C8`.
2. **Find your node id** from your repo's `CLAUDE.md` pointer. Call it `$ID`.

## Steps

1. **Pull coordn8 first.** `git -C $C8 pull --ff-only` so you write on top of the latest (avoids conflicts).

2. **Run your project-specific extension (`local.md`), if any.** If `.claude/skills/coordn8-update/local.md` exists, read it and perform its steps as part of this update. This is where a repo plugs in its own behavior — e.g. spawning **project-specific subagents** to summarize recent work into the event lines, or running extra validation before publishing status. Its output typically feeds the status/event steps below. coordn8 owns this skill's `SKILL.md` and overwrites it on refresh, but **never touches `local.md`**, so your customization persists.

3. **Update your status** in `$C8/nodes/$ID.md` — you own the **status fields and body**, not the structural frontmatter:
   - Set `heat` / `stage` / `next_move` / `status` to reflect reality; refresh `last_touched` to today.
   - Update the body (priorities / current focus) if it moved.
   - Add `coordination:` entries for anything you need from coordn8 or another node, and `pending_on_nate:` for blockers only Nate can clear.
   - Set `triage: claude` on anything you set autonomously.
   - Do **not** touch `theme`/`parent`/`kind`/`anchors` — those are coordn8/Nate's.

4. **Log progress** in `$C8/events/$ID.md` — prepend newest-first, one line per logical change (not per commit):
   ```
   - YYYY-MM-DD KIND: one-line past-tense summary [optional refs]
   ```
   `KIND ∈ {done, progress, new-task, decision, milestone, blocked}`; refs like `[task: slug]`, `[pr: url]`, `[node: other-id]`. Group a session's commits into a few meaningful lines. Append-only — never edit past entries. Grammar: `$C8/events/README.md`.

5. **Raise asks at other nodes** (optional). If your work means another node has something to do:
   - **Lightweight:** append a dated, attributed bullet to that node's `## Inbound` in `$C8/nodes/<other>.md`:
     `- YYYY-MM-DD (from: $ID) <kind>: <one line>.`
   - **Tracked:** create `$C8/tasks/<slug>.md` with `node: $ID`, `targets: [<other>]`, `status: open`, `triage: none`, `streams: [planning]`, and a one-line description, so it also shows on your own board.

6. **Commit + push coordn8.** Message style `{id}: short imperative`. From the primary laptop use the credential override in coordn8's `CLAUDE.md`; from anywhere else a plain `git -C $C8 push` works. Your own repo commits separately.

## Repo vs asset

- **Repo node:** the above as written. Your detailed tasks stay in your own tracking; coordn8 gets the rollup + events.
- **Asset node** (usually `tracking: coordn8`): your tasks already live in `$C8/tasks/`, so "update" is mostly status + events (e.g. `done: consolidated 40 build photos into builds/`). Still log every meaningful batch of work to `events/$ID.md`.
