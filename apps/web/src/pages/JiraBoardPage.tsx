import { useState } from 'react';
import type { JiraTicket } from '@segmentpay/shared';
import { useJiraTickets } from '../lib/queries.js';

type BoardTab = 'kanban' | 'list';
type JiraStatus = 'TODO' | 'IN_PROGRESS' | 'DONE';

const STATUS_FA: Record<JiraStatus, string> = {
  DONE: 'انجام شده',
  IN_PROGRESS: 'در حال انجام',
  TODO: 'برای انجام',
};

const STATUS_STYLE: Record<JiraStatus, string> = {
  DONE: 'bg-green-100 text-green-700',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  TODO: 'bg-gray-100 text-gray-600',
};

const PRIORITY_STYLE: Record<string, string> = {
  CRITICAL: 'text-red-600',
  HIGH: 'text-orange-500',
  MEDIUM: 'text-yellow-500',
  LOW: 'text-gray-400',
};

interface TicketDetailProps {
  ticket: JiraTicket;
  onClose: () => void;
}

function TicketDetail({ ticket, onClose }: TicketDetailProps) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center">
      <div className="bg-white w-full max-w-md rounded-t-2xl max-h-[85vh] overflow-y-auto p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <span className="text-xs text-gray-400 font-mono">{ticket.key}</span>
            <h2 className="font-bold text-gray-900 text-sm mt-0.5">{ticket.summaryFa}</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl leading-none">
            ×
          </button>
        </div>

        <div className="flex gap-2 mb-3">
          <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${STATUS_STYLE[ticket.status as JiraStatus]}`}>
            {STATUS_FA[ticket.status as JiraStatus] ?? ticket.status}
          </span>
          <span className={`text-xs font-semibold ${PRIORITY_STYLE[ticket.priority] ?? ''}`}>
            {ticket.priority}
          </span>
        </div>

        <div className="flex flex-col gap-4 text-sm text-gray-700">
          <section>
            <h3 className="font-semibold text-xs text-gray-500 uppercase mb-1">داستان کاربر</h3>
            <p className="text-xs">{ticket.userStoryFa}</p>
          </section>

          <section>
            <h3 className="font-semibold text-xs text-gray-500 uppercase mb-1">توضیحات</h3>
            <p className="text-xs">{ticket.descriptionFa}</p>
          </section>

          <section>
            <h3 className="font-semibold text-xs text-gray-500 uppercase mb-1">معیارهای پذیرش</h3>
            <div className="flex flex-col gap-2">
              {ticket.acceptanceCriteria.map((ac, i) => (
                <div key={i} className="bg-gray-50 rounded-lg p-2 text-xs">
                  <p><span className="font-medium">با توجه به:</span> {ac.given}</p>
                  <p><span className="font-medium">وقتی:</span> {ac.when}</p>
                  <p><span className="font-medium">آنگاه:</span> {ac.then}</p>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h3 className="font-semibold text-xs text-gray-500 uppercase mb-1">سناریوها</h3>
            <p className="text-xs"><span className="font-medium">مسیر موفق:</span> {ticket.scenarios.happyPath}</p>
            <p className="text-xs mt-1"><span className="font-medium">مسیر منفی:</span> {ticket.scenarios.negative}</p>
          </section>

          <section>
            <h3 className="font-semibold text-xs text-gray-500 uppercase mb-1">Test IDs</h3>
            <div className="flex flex-wrap gap-1">
              {ticket.testIds.map((id) => (
                <code key={id} className="text-xs bg-purple-50 text-purple-700 rounded px-1.5 py-0.5">{id}</code>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function TicketCard({ ticket, onClick }: { ticket: JiraTicket; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 text-right w-full hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between gap-2">
        <span className={`text-xs font-bold flex-shrink-0 ${PRIORITY_STYLE[ticket.priority] ?? ''}`}>
          {ticket.priority}
        </span>
        <span className="text-xs text-gray-400 font-mono">{ticket.key}</span>
      </div>
      <p className="text-sm font-semibold text-gray-800 mt-1 text-right">{ticket.summaryFa}</p>
      <p className="text-xs text-gray-500 mt-1 text-right line-clamp-2">{ticket.descriptionFa}</p>
      <div className="flex flex-wrap gap-1 mt-2">
        {ticket.testIds.slice(0, 3).map((id) => (
          <span key={id} className="text-xs bg-gray-100 text-gray-500 rounded px-1">{id}</span>
        ))}
        {ticket.testIds.length > 3 && (
          <span className="text-xs text-gray-400">+{ticket.testIds.length - 3}</span>
        )}
      </div>
    </button>
  );
}

export function JiraBoardPage() {
  const { data: tickets = [], isLoading } = useJiraTickets();
  const [tab, setTab] = useState<BoardTab>('kanban');
  const [selected, setSelected] = useState<JiraTicket | null>(null);

  const statuses: JiraStatus[] = ['DONE', 'IN_PROGRESS', 'TODO'];

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-gray-100">
        <h1 className="font-bold text-gray-800 text-lg">تیکت‌های جیرا</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 px-4 py-2 border-b border-gray-100">
        <button
          onClick={() => setTab('kanban')}
          className={`flex-1 rounded-lg py-1.5 text-sm font-medium transition-colors ${
            tab === 'kanban' ? 'bg-purple-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          کانبان
        </button>
        <button
          onClick={() => setTab('list')}
          className={`flex-1 rounded-lg py-1.5 text-sm font-medium transition-colors ${
            tab === 'list' ? 'bg-purple-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          لیست
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3">
        {isLoading ? (
          <div className="flex items-center justify-center h-32 text-gray-400">در حال بارگذاری...</div>
        ) : tab === 'kanban' ? (
          <div className="flex flex-col gap-6">
            {statuses.map((status) => {
              const group = tickets.filter((t) => t.status === status);
              return (
                <div key={status}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-xs font-semibold rounded-full px-2 py-0.5 ${STATUS_STYLE[status]}`}>
                      {STATUS_FA[status]}
                    </span>
                    <span className="text-xs text-gray-400">{group.length}</span>
                  </div>
                  {group.length === 0 ? (
                    <p className="text-xs text-gray-300 px-2">خالی</p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {group.map((t) => (
                        <TicketCard key={t.key} ticket={t} onClick={() => setSelected(t)} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {tickets.map((t) => (
              <TicketCard key={t.key} ticket={t} onClick={() => setSelected(t)} />
            ))}
          </div>
        )}
      </div>

      {selected && <TicketDetail ticket={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
