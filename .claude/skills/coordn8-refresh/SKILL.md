---
name: coordn8-refresh
description: Pull the latest coordn8 and reconcile this node's coordn8 file into local tracking. Use at the start of a session, or whenever you want to sync this node with coordn8 — drains the node's ## Inbound, adopts structural changes Nate made, picks up any updated skill templates. Run this before doing work so you act on current priorities.
---

# coordn8-refresh

Sync **from** coordn8 into this node. Run at session start (or any time you want the latest). This is one half of the core loop; [`coordn8-update`](../coordn8-update/SKILL.md) is the other.

## Resolve the basics first

1. **Find coordn8.** Read `~/.coordn8.json`; use the `coordn8` key (default `~/coordn8`). Call it `$C8`.
2. **Find your node id.** It's the `nodes/{id}.md` your repo's `CLAUDE.md` pointer names. Call it `$ID`.

## Steps

1. **Pull coordn8.** `git -C $C8 pull --ff-only`. If it can't fast-forward, stop and reconcile by hand before continuing.

2. **Read your node file** `$C8/nodes/$ID.md`. Compare against what you last knew:
   - **Drain `## Inbound`.** For each entry (a dated, attributed bug/idea/ask another node left for you): decide how to track it — promote to your local tracking (a GitHub issue, a `backlog.md` line, a Linear ticket, or a coordn8 task), fold it into your priorities, or close it. Then **remove the drained entries** from `## Inbound` (you own that section) and record what you did with each in `events/$ID.md` via `coordn8-update`.
   - **Adopt structural changes.** Nate/coordn8 may have changed your `theme`/`parent`/`kind`/`anchors`/`summary`. Adopt them; don't fight or revert them. If something looks wrong, raise it (don't silently change it back).
   - **Check `coordination:` and `pending_on_nate`.** Clear anything now resolved.

3. **Skim recent activity.** Read the top of `$C8/events/$ID.md` so you don't re-log progress that's already recorded, and so you have context on what the last session reported.

4. **Self-update the shared skills (meta).** coordn8 owns each skill's `SKILL.md`; you own an optional `local.md` in the same dir (your project-specific extension — see step 5). Sync **only** the coordn8-owned `SKILL.md`, never your `local.md`:
   ```
   for skill in coordn8-refresh coordn8-update; do
     diff -q "$C8/skills/$skill/SKILL.md" ".claude/skills/$skill/SKILL.md" >/dev/null 2>&1 \
       || cp "$C8/skills/$skill/SKILL.md" ".claude/skills/$skill/SKILL.md"
   done
   ```
   Also install any **brand-new** skill dirs coordn8 added under `$C8/skills/` that you don't have yet (copy `SKILL.md` only). **Never create, modify, or delete `local.md`** — it is repo-owned and is not part of the sync. Note any skill change in your update.

5. **Run your project-specific extension (`local.md`), if any.** If `.claude/skills/coordn8-refresh/local.md` exists, read it and perform its steps as part of this refresh — custom reconcile logic, project-specific subagents, extra checks. This file is yours; coordn8 never overwrites it, so it survives every skill update.

6. **If you changed the node file** (drained `## Inbound`), commit + push coordn8 — or leave it for your `coordn8-update` at the end of the session. Don't leave `## Inbound` half-drained across sessions.

## Repo vs asset

- **Repo node:** "local tracking" is your real backlog (issues / `backlog.md` / Linear). Convert `## Inbound` items into it. Run the skill self-update step.
- **Asset node:** you likely have no issue tracker and maybe no `.claude/skills/` — "local tracking" is usually a folder README/manifest. Also read any **initiative tasks targeting you** (`targets:` includes `$ID`) in `$C8/tasks/`, since asset work is often driven by initiatives. Skip the skill self-update and `local.md` steps if this folder isn't a Claude Code project.
