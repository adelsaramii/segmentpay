import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Kanban, List } from 'lucide-react';
import type { JiraTicket } from '@segmentpay/shared';
import { useJiraTickets } from '../lib/queries.js';
import { Pill, type PillProps } from '../components/ui/Pill.js';
import { Skeleton } from '../components/ui/Skeleton.js';
import { cn } from '../lib/cn.js';

type BoardTab = 'kanban' | 'list';
type JiraStatus = 'TODO' | 'IN_PROGRESS' | 'DONE';

const STATUS_FA: Record<JiraStatus, string> = {
  DONE: 'انجام شده',
  IN_PROGRESS: 'در حال انجام',
  TODO: 'برای انجام',
};

const STATUS_TONE: Record<JiraStatus, PillProps['tone']> = {
  DONE: 'success',
  IN_PROGRESS: 'brand',
  TODO: 'neutral',
};

const PRIORITY_TONE: Record<string, PillProps['tone']> = {
  CRITICAL: 'danger',
  HIGH: 'warning',
  MEDIUM: 'cashback',
  LOW: 'neutral',
};

interface TicketDetailProps {
  ticket: JiraTicket;
  onClose: () => void;
}

function TicketDetail({ ticket, onClose }: TicketDetailProps) {
  return (
    <motion.div
      className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        onClick={(e) => e.stopPropagation()}
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 320, damping: 32 }}
        className="bg-elevated w-full max-w-md rounded-t-4xl max-h-[85vh] overflow-y-auto p-4 border-t border-hairline"
      >
        <div className="mx-auto h-1 w-10 rounded-full bg-muted mb-3" />
        <div className="flex items-start justify-between mb-3 gap-2">
          <div className="min-w-0">
            <span className="text-xs text-soft font-mono">{ticket.key}</span>
            <h2 className="font-extrabold text-text text-base mt-0.5">{ticket.summaryFa}</h2>
          </div>
          <button
            onClick={onClose}
            className="h-9 w-9 rounded-full bg-muted text-subtle press flex items-center justify-center flex-shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex gap-2 mb-4">
          <Pill tone={STATUS_TONE[ticket.status as JiraStatus]}>
            {STATUS_FA[ticket.status as JiraStatus] ?? ticket.status}
          </Pill>
          <Pill tone={PRIORITY_TONE[ticket.priority] ?? 'neutral'}>{ticket.priority}</Pill>
        </div>

        <div className="flex flex-col gap-4 text-sm">
          <section>
            <h3 className="text-[11px] font-semibold text-soft uppercase mb-1">داستان کاربر</h3>
            <p className="text-xs text-text">{ticket.userStoryFa}</p>
          </section>

          <section>
            <h3 className="text-[11px] font-semibold text-soft uppercase mb-1">توضیحات</h3>
            <p className="text-xs text-text">{ticket.descriptionFa}</p>
          </section>

          <section>
            <h3 className="text-[11px] font-semibold text-soft uppercase mb-1">معیارهای پذیرش</h3>
            <div className="flex flex-col gap-2">
              {ticket.acceptanceCriteria.map((ac, i) => (
                <div key={i} className="bg-muted rounded-2xl p-2.5 text-xs flex flex-col gap-1">
                  <p><span className="text-subtle">با توجه به:</span> <span className="text-text">{ac.given}</span></p>
                  <p><span className="text-subtle">وقتی:</span> <span className="text-text">{ac.when}</span></p>
                  <p><span className="text-subtle">آنگاه:</span> <span className="text-text">{ac.then}</span></p>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h3 className="text-[11px] font-semibold text-soft uppercase mb-1">سناریوها</h3>
            <p className="text-xs"><span className="text-subtle">مسیر موفق:</span> <span className="text-text">{ticket.scenarios.happyPath}</span></p>
            <p className="text-xs mt-1"><span className="text-subtle">مسیر منفی:</span> <span className="text-text">{ticket.scenarios.negative}</span></p>
          </section>

          <section>
            <h3 className="text-[11px] font-semibold text-soft uppercase mb-1">Test IDs</h3>
            <div className="flex flex-wrap gap-1">
              {ticket.testIds.map((id) => (
                <code key={id} className="text-xs bg-brand-soft text-brand rounded-lg px-1.5 py-0.5 font-mono">
                  {id}
                </code>
              ))}
            </div>
          </section>
        </div>
      </motion.div>
    </motion.div>
  );
}

function TicketCard({ ticket, onClick }: { ticket: JiraTicket; onClick: () => void }) {
  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.98 }}
      className="rounded-3xl bg-surface border border-hairline shadow-sm2 p-3 text-right w-full press hover:border-brand/40 transition-colors"
    >
      <div className="flex items-start justify-between gap-2">
        <Pill tone={PRIORITY_TONE[ticket.priority] ?? 'neutral'}>{ticket.priority}</Pill>
        <span className="text-[11px] text-soft font-mono">{ticket.key}</span>
      </div>
      <p className="text-sm font-semibold text-text mt-2 text-right">{ticket.summaryFa}</p>
      <p className="text-xs text-subtle mt-1 text-right line-clamp-2">{ticket.descriptionFa}</p>
      <div className="flex flex-wrap gap-1 mt-2">
        {ticket.testIds.slice(0, 3).map((id) => (
          <span key={id} className="text-[10px] bg-muted text-soft rounded-md px-1.5 py-0.5 font-mono">
            {id}
          </span>
        ))}
        {ticket.testIds.length > 3 && (
          <span className="text-[10px] text-soft">+{ticket.testIds.length - 3}</span>
        )}
      </div>
    </motion.button>
  );
}

export function JiraBoardPage() {
  const { data: tickets = [], isLoading } = useJiraTickets();
  const [tab, setTab] = useState<BoardTab>('kanban');
  const [selected, setSelected] = useState<JiraTicket | null>(null);

  const statuses: JiraStatus[] = ['DONE', 'IN_PROGRESS', 'TODO'];

  return (
    <div className="flex flex-col pb-4">
      <div className="px-4 pt-2 pb-3">
        <h1 className="font-extrabold text-text text-2xl tracking-tight">تیکت‌های جیرا</h1>
        <p className="text-xs text-subtle mt-0.5">معیارهای پذیرش و شناسه‌های تست</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 px-4 py-2">
        {(['kanban', 'list'] as BoardTab[]).map((t) => {
          const active = tab === t;
          const Icon = t === 'kanban' ? Kanban : List;
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'relative flex-1 h-10 rounded-2xl text-sm font-semibold press inline-flex items-center justify-center gap-2',
                active ? 'text-white' : 'bg-muted text-subtle hover:text-text',
              )}
            >
              {active && (
                <motion.span
                  layoutId="jiraTabPill"
                  className="absolute inset-0 rounded-2xl bg-text"
                  transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                />
              )}
              <span className="relative z-10 inline-flex items-center gap-1.5">
                <Icon size={14} />
                {t === 'kanban' ? 'کانبان' : 'لیست'}
              </span>
            </button>
          );
        })}
      </div>

      <div className="px-4 pt-2">
        {isLoading ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-3xl" />
            ))}
          </div>
        ) : tab === 'kanban' ? (
          <div className="flex flex-col gap-5">
            {statuses.map((status) => {
              const group = tickets.filter((t) => t.status === status);
              return (
                <div key={status}>
                  <div className="flex items-center gap-2 mb-2">
                    <Pill tone={STATUS_TONE[status]}>{STATUS_FA[status]}</Pill>
                    <span className="text-xs text-soft tnum">{group.length}</span>
                  </div>
                  {group.length === 0 ? (
                    <p className="text-xs text-soft px-1">خالی</p>
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

      <AnimatePresence>
        {selected && <TicketDetail ticket={selected} onClose={() => setSelected(null)} />}
      </AnimatePresence>
    </div>
  );
}
