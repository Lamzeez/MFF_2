# readMe_EndSession.md --- AI Agent End/Pause Checklist

Use this before pausing MFF development, closing your AI Agent, or switching to
a different major objective.

## End-session prompt

Paste this into the AI Agent:

``` text
We are pausing this MFF development session.

Do not start new feature work.

Perform an end-of-session review:

1. Inspect git status and the complete diff for changes made during this session.
2. Review the changed code for obvious regressions, dead code, duplicate types, inconsistent domain/status names, debug artifacts, accidental secrets, and unfinished TODOs.
3. Verify that NO Docker commands were run or required. All backend work must target remote Supabase.
4. Run the automated quality verification: npm run check (and npm run check:client-bundle if client infrastructure was touched).
5. Do not claim a command passed unless you actually ran it.
6. Update progress.md so it accurately records:
   - meaningful work completed (specifically on real Auth, registrations, sign-ins, and sessions)
   - architectural/product decisions made
   - verification commands and results
   - known issues or incomplete work
   - exact next recommended tasks
7. Update goal.md only if milestones, priorities, or acceptance criteria genuinely changed.
8. Do not turn progress.md into a chronological chat log; keep it concise and current.
9. Do not commit, push, reset, discard, or revert anything unless I explicitly ask.

Then give me a final handoff with:
- Completed
- Files changed
- Verification
- Known issues
- Uncommitted changes
- Next 3 recommended actions
- Suggested first prompt for the next session
```

## Before closing Codex

Check:

``` text
/status
```

If you plan to resume the same objective and the context is large:

``` text
/compact
```

Compaction is optional at shutdown; durable repository memory matters
more.

## Git review

Have Codex show or inspect:

``` bash
git status
git diff --stat
git diff
```

If commits already exist during the session, also inspect recent
history:

``` bash
git log --oneline -10
```

Do not use destructive Git commands merely to make the tree look clean.

## What must be captured in progress.md

Record durable facts only.

Good:
- Customer registration and login connected to real Supabase Auth with email verification code flow
- Merchant login now authenticates via Supabase Auth and validates active `store_memberships` role; demo credentials removed
- Persistent session storage verified across app restart via `expo-sqlite` and `SessionContext`
- `npm run check` passed (TypeScript clean, 12 unit tests passed)
- Next task: Migrate Rider registration and login to real Supabase Auth

Bad:
- "We talked about auth for 30 minutes"
- Every file opened
- Pasting long terminal logs
- Speculative ideas not accepted as decisions

## If work is incomplete

Make the state explicit.

Example:

``` text
INCOMPLETE:
- Database migration created.
- Customer query migrated.
- Merchant mutation not migrated.
- Do not remove mock fallback yet.
- Next session should begin in services/orders and merchant order queue.
```

Never let an unfinished migration appear complete in project memory.

## If a bug remains

Capture: - observable symptom - reproduction steps - suspected area
(only if supported) - logs/error text worth preserving - what has
already been tried - next diagnostic step

## If architecture changed

Ensure documentation answers: - what changed - why - what old path is
deprecated - whether migration is complete - what callers still use the
old path - whether data/schema changes are required

## If the session introduced backend/security work

Explicitly review: - secrets/client exposure - RLS/authorization -
ownership checks - server-authoritative pricing/status - validation -
PII logging - idempotency/race conditions

## Commit/push

Only ask Codex to commit/push when you want it.

Suggested commit request:

``` text
Review the final diff one more time. If verification is clean and no unrelated changes are included, propose a concise conventional commit message. Wait for my approval before committing. Do not push unless I explicitly request it.
```

## Next-session handoff

The ideal next session should be able to start with:

``` text
Read AGENTS.md, progress.md, and goal.md. Inspect git status and recent history. Continue from the highest-priority unfinished item in progress.md. Do not assume the previous chat transcript is available.
```

If that prompt is insufficient, the project memory was not updated well
enough.
