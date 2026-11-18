import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import type { JiraTicket } from '@segmentpay/shared';

const ticketsUrl = new URL('../../../../jira/tickets.json', import.meta.url);
const ticketsPath = fileURLToPath(ticketsUrl);
const raw = readFileSync(ticketsPath, 'utf-8');
const data = JSON.parse(raw) as {
  project: { key: string; name: string; nameFa: string };
  tickets: JiraTicket[];
};

export const jiraProject = data.project;
export const jiraTickets: JiraTicket[] = data.tickets;
