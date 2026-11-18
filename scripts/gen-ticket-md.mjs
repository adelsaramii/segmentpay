#!/usr/bin/env node
// Generates one Markdown file per ticket from jira/tickets.json.
// Idempotent; safe to re-run after editing tickets.json.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const srcPath = resolve(root, 'jira/tickets.json');
const outDir = resolve(root, 'jira/tickets');

const data = JSON.parse(await readFile(srcPath, 'utf8'));
await mkdir(outDir, { recursive: true });

for (const t of data.tickets) {
  const lines = [
    `# ${t.key} · ${t.summary}`,
    '',
    `**Status:** ${t.status} · **Priority:** ${t.priority} · **Route:** \`${t.route}\``,
    '',
    `## User story`,
    '',
    t.userStory,
    '',
    `_FA:_ ${t.userStoryFa}`,
    '',
    `## Description`,
    '',
    t.description,
    '',
    `_FA:_ ${t.descriptionFa}`,
    '',
    `## Preconditions`,
    '',
    ...t.preconditions.map((p) => `- ${p}`),
    '',
    `## Acceptance criteria (Given / When / Then)`,
    '',
    ...t.acceptanceCriteria.flatMap((ac, i) => [
      `**AC-${i + 1}**`,
      `- Given ${ac.given}`,
      `- When ${ac.when}`,
      `- Then ${ac.then}`,
      '',
    ]),
    `## Scenarios`,
    '',
    `**Happy path:** ${t.scenarios.happyPath}`,
    '',
    `**Negative / edge:** ${t.scenarios.negative}`,
    '',
    `## Expected results`,
    '',
    ...t.expectedResults.map((r) => `- ${r}`),
    '',
    `## data-testid contract`,
    '',
    ...t.testIds.map((id) => `- \`${id}\``),
    '',
  ];
  await writeFile(resolve(outDir, `${t.key}.md`), lines.join('\n'), 'utf8');
}

console.log(`[ok] wrote ${data.tickets.length} ticket files to ${outDir}`);
