# How to use these files with Claude Code

1. Clone this repo and open it in VS Code:
   `git clone https://github.com/samuelms18/Rental-Management-System.git`
2. `CLAUDE.md` is already at the root; Claude Code reads it automatically.
3. The requirements are in `docs/REQUIREMENTS.md` and the phase guides in `docs/phases/`.
4. Install: Node 20+, pnpm, Git, Docker (for local Supabase), Supabase CLI. Create free accounts: GitHub, Supabase, Cloudflare,
   and a Gmail account for sending app email (turn on 2-Step Verification, then create an app password).
5. Start Claude Code in the folder and paste, one phase at a time:

```
Read CLAUDE.md and docs/phases/phase-01-foundation.md.
Give me a step-by-step plan first. Wait for my OK before writing code.
```

6. After each phase, check every item under "Acceptance", then commit and start the next phase in a fresh session:

```
Phase 1 is done and committed. Read CLAUDE.md and docs/phases/phase-02-properties.md. Plan first, then wait for my OK.
```

## Phase order
| # | File | Release |
|---|------|---------|
| 1 | phase-01-foundation.md | V1 Core |
| 2 | phase-02-properties.md | V1 Core |
| 3 | phase-03-tenants.md | V1 Core |
| 4 | phase-04-finance.md | V1 Core |
| 5 | phase-05-complaints-dashboards.md | V1 Core (go-live) |
| 6 | phase-06-agreements.md | V1.5 |
| 7 | phase-07-move-in-out.md | V1.5 |
| 8 | phase-08-people-costs.md | V1.5 |
| 9 | phase-09-reports.md | V2 |
| 10 | phase-10-hardening.md | V2 |

## Tips
- Never put real tenant data in until Phase 5's go-live checklist passes.
- If Claude Code proposes a paid service, say no; CLAUDE.md already forbids it.
- Keep each session to one phase; long sessions lose context.
