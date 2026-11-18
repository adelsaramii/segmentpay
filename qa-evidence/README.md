# QA Evidence

This directory collects artifacts produced by the SegmentPay QA Agent during ticket verification runs.

Each run writes:

- `run-YYYY-MM-DDTHH-MM-SS/report.md` — human-readable verdict per ticket
- `run-YYYY-MM-DDTHH-MM-SS/report.json` — machine-readable verdict
- `run-YYYY-MM-DDTHH-MM-SS/screenshots/SPAY-xxx-step-N.png` — step-by-step evidence (pixel-perfect comparison against the design where possible)

Verdicts are one of `VERIFIED`, `FAILED`, `BLOCKED`, or `ESCALATED`, matching the QA-Agent-MVP conventions. Only the QA Agent (not the Developer Agent) writes these verdicts.
