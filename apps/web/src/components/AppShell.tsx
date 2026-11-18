import { type ReactNode } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, ShoppingBag, Package, ReceiptText, Kanban, ChevronRight } from 'lucide-react';
import { ThemeToggle } from './ui/ThemeToggle.js';
import { cn } from '../lib/cn.js';

interface AppShellProps {
  children: ReactNode;
}

const NAV_TABS = [
  { label: 'خانه', path: '/wallet', Icon: Home },
  { label: 'فروشگاه', path: '/shop', Icon: ShoppingBag },
  { label: 'سفارش‌ها', path: '/orders', Icon: Package },
  { label: 'دفتر کل', path: '/ledger', Icon: ReceiptText },
  { label: 'جیرا', path: '/jira', Icon: Kanban },
];

const NESTED_PATHS = ['/cart', '/checkout', '/payment-result', '/orders/'];

function isNested(pathname: string) {
  return NESTED_PATHS.some((p) => {
    if (p.endsWith('/')) return pathname.startsWith(p) && pathname.length > p.length;
    return pathname === p || pathname.startsWith(p + '/');
  });
}

export function AppShell({ children }: AppShellProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const nested = isNested(location.pathname);

  return (
    <div className="flex min-h-screen bg-app items-start justify-center font-fa" dir="rtl">
      <div className="relative flex flex-col w-full max-w-md min-h-screen bg-bg">
        {/* Top bar */}
        <header className="sticky top-0 z-20 flex items-center justify-between bg-bg/80 backdrop-blur-lg border-b border-hairline px-4 py-3">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl gradient-brand text-white shadow-glow">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7h12a4 4 0 0 1 4 4v3a4 4 0 0 1-4 4H4z"/><circle cx="16" cy="12.5" r="1.5" fill="currentColor"/></svg>
            </span>
            <span className="text-base font-extrabold tracking-tight text-text">سگمنت‌پی</span>
          </div>
          <div className="flex items-center gap-1.5">
            <AnimatePresence initial={false}>
              {nested && (
                <motion.button
                  key="back"
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={{ duration: 0.18 }}
                  onClick={() => navigate(-1)}
                  className="inline-flex items-center gap-1 rounded-full bg-muted px-3 h-9 text-xs font-semibold text-text press"
                  aria-label="بازگشت"
                >
                  <span>بازگشت</span>
                  <ChevronRight size={14} />
                </motion.button>
              )}
            </AnimatePresence>
            <ThemeToggle />
          </div>
        </header>

        {/* Main content with page transition */}
        <main className="flex-1 overflow-y-auto pb-24">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Bottom nav */}
        <nav className="fixed bottom-3 inset-x-0 max-w-md mx-auto z-30 px-3">
          <div className="flex rounded-3xl bg-elevated/85 backdrop-blur-xl border border-hairline shadow-md2 p-1.5">
            {NAV_TABS.map((tab) => (
              <NavLink
                key={tab.path}
                to={tab.path}
                className={({ isActive }) =>
                  cn(
                    'relative flex-1 flex flex-col items-center justify-center py-2 rounded-2xl text-[11px] gap-1 press transition-colors',
                    isActive ? 'text-brand' : 'text-subtle hover:text-text',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <motion.span
                        layoutId="navActivePill"
                        className="absolute inset-0 bg-brand-soft rounded-2xl"
                        transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                      />
                    )}
                    <span className="relative z-10 inline-flex">
                      <tab.Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                    </span>
                    <span className={cn('relative z-10', isActive && 'font-semibold')}>{tab.label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </nav>
      </div>
    </div>
  );
}
