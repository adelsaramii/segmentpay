# QA Agent Workflow (adapted for Web)

The QA-Agent-MVP (https://github.com/adelsaramii/qa-agent-mvp) is an iOS-focused QA orchestrator that reads Jira tickets and verifies features against a running app. SegmentPay adapts the same methodology to a running PWA using Playwright as the driver.

## Three actors (mirrors QA-Agent-MVP)

1. **Workflow orchestrator (Opus main brain)** — picks the next ticket from `jira/tickets.json`, decides when to merge.
2. **Developer agent (Sonnet)** — writes code to satisfy a ticket's acceptance criteria. Cannot self-verify.
3. **QA agent (Sonnet + Playwright MCP)** — the sole authority on VERIFIED / FAILED / BLOCKED. Receives the ticket JSON, the live app URL, and the `data-testid` dictionary; emits a report + screenshots.

## Key invariant

Developer and QA agents never share conversation context. The QA agent reconstructs its context from:

- The ticket JSON (`jira/tickets.json`)
- The running app (`http://127.0.0.1:5173`)
- The architecture doc (`docs/ARCHITECTURE.md`)
- The design image (`SegmentPay Persian Fintech UI Board.png`) — for pixel comparison when supported

## Per-ticket procedure

1. Workflow orchestrator writes a QA brief that includes the ticket JSON and the base URL.
2. QA agent uses Playwright MCP to:
   1. `POST /api/dev/reset`
   2. Set the appropriate gateway mode where the ticket requires it
   3. Drive the UI through the `testIds` in the ticket
   4. Assert each acceptance criterion
   5. Take a screenshot at every step
3. QA agent writes a per-ticket verdict and an overall run report to `qa-evidence/run-<timestamp>/`.
4. Orchestrator gates the PR merge on **all tickets VERIFIED**.
5. If any ticket is FAILED, the orchestrator either patches the code (optionally delegating to a Developer agent) and re-runs QA on that ticket, or rolls back and re-plans.

## PR evidence template

The PR body must include:

```markdown
### QA Agent run <timestamp>
Base URL: http://127.0.0.1:5173
Tickets verified: 12 / 12

| Ticket | Summary | Verdict | Evidence |
|--------|---------|---------|----------|
| SPAY-101 | Wallet overview | VERIFIED | qa-evidence/.../SPAY-101-step-3.png |
...
```

See `qa-evidence/README.md` for file layout.
