# readMe_StartSession.md --- AI Agent Start/Resume Checklist

Use this at the beginning of every meaningful MFF development session.

## Recommended launch

From the repository root:

``` powershell
cd "E:\Documents\Capstone\MFF_2 - Copy"
```

Start a clean agent thread or resume an active one. A fresh thread is appropriate when moving between distinct milestones, provided the repository memory files (`AGENTS.md`, `progress.md`, `goal.md`) are up-to-date.

## First prompt for the AI Agent

Paste this:

``` text
We are continuing development of Mati FoodFinder (MFF).

CRITICAL CONSTRAINTS BEFORE YOU BEGIN:
1. Docker is SKIPPED COMPLETELY. Do NOT run Docker, Docker Desktop, or local containerized stacks (e.g., supabase start).
2. All backend integration directly targets remote/hosted Supabase configured via .env (EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY).
3. Active milestone: Real Supabase Auth, Registrations, Sign-ins, and Persistent Sessions (Customer, Merchant, Rider).

Before changing any code:
1. Read AGENTS.md completely.
2. Read progress.md completely.
3. Read goal.md completely.
4. Inspect git status and recent git history.
5. Inspect the files relevant to the current task.
6. Verify package.json and the installed Expo/React Native versions (Expo SDK 57-era).
7. Verify that no Docker commands are planned or invoked.
8. Do not modify files yet.

Then give me a concise session briefing containing:
- current project phase (Milestone 2A: Real Auth & Sessions)
- active focus area for today's task
- remote Supabase & environment status (.env validation)
- uncommitted changes that must be protected
- verification commands you intend to run (e.g., npm run check)
- proposed plan of action

Wait for my task or confirmation before making changes.
```

## If resuming an existing agent conversation

If the current thread is still about the same development objective but context has become large, ask the agent to re-read:
- `AGENTS.md`
- `progress.md`
- `goal.md`

Do not depend on chat memory alone.

## Optional session goal

For a substantial multi-step task, set a focused agent goal.

Example (Customer Auth):
``` text
Migrate customer registration and sign-in to real Supabase Auth, connecting AccountForm to SessionContext, verifying email confirmation and session persistence, without running Docker.
```

Example (Merchant Auth):
``` text
Migrate merchant login from prototype credentials (lette@karenderia.com) to real Supabase Auth, verifying store membership and session lifecycle.
```

Example (Rider Auth):
``` text
Migrate rider registration and sign-in to real Supabase Auth, verifying platform rider role assignment and persistent session storage.
```

Keep the goal narrower than "finish MFF."

## Before approving edits

Confirm the proposed work: - solves one coherent problem - respects
current uncommitted work - does not create a parallel domain model -
does not add another prototype-only shortcut where production
architecture is required - includes a verification plan - identifies any
schema/security implications

## During the session

Prefer this loop:

``` text
inspect -> plan -> small coherent change -> verify -> review diff -> continue
```

Useful prompts:

``` text
Show me the exact architectural problem before editing it.
```

``` text
Make the smallest coherent fix. Do not refactor unrelated code.
```

``` text
Before continuing, review the diff for regressions, duplicate types, stale imports, and inconsistent status names.
```

``` text
Run the relevant verification. Do not claim success for commands you did not run.
```

## Context management

Use `/status` periodically.

Use `/compact` when: - the objective is unchanged - the conversation is
long - earlier detail is no longer needed verbatim

Start a new thread when: - moving to a substantially different feature -
the current thread is confused by old assumptions - `progress.md` is
current enough to hand off safely

The durable memory should live in: 1. code 2. Git history 3. `AGENTS.md`
4. `progress.md` 5. `goal.md`

The chat transcript is working memory, not the project's only memory.

## Session task template

Use this when giving Codex a task:

``` text
Today's task:
[describe one concrete outcome]

Requirements:
- [requirement]
- [requirement]

Do not change:
- [protected behavior/files if applicable]

Definition of done:
- implementation complete
- relevant type/lint/test/build checks run
- diff reviewed
- progress.md updated
- unresolved limitations explicitly reported
```
