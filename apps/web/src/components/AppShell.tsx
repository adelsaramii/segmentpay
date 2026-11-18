import { type ReactNode } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';

interface AppShellProps {
  children: ReactNode;
}

const NAV_TABS = [
  { label: 'خانه', path: '/wallet', icon: '🏠' },
  { label: 'فروشگاه', path: '/shop', icon: '🛍️' },
  { label: 'سفارش‌ها', path: '/orders', icon: '📦' },
  { label: 'دفتر کل', path: '/ledger', icon: '📋' },
  { label: 'جیرا', path: '/jira', icon: '🎫' },
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
    <div className="flex min-h-screen bg-gray-100 items-start justify-center font-fa" dir="rtl">
      <div className="relative flex flex-col w-full max-w-md min-h-screen bg-white shadow-xl">
        {/* Top bar */}
        <header className="sticky top-0 z-20 flex items-center justify-between bg-white border-b border-gray-100 px-4 py-3">
          <span className="text-lg font-bold text-brand-700" style={{ color: 'var(--color-brand-700)' }}>
            سگمنت‌پی
          </span>
          {nested && (
            <button
              onClick={() => navigate(-1)}
              className="text-sm text-gray-500 hover:text-gray-900 flex items-center gap-1"
              aria-label="بازگشت"
            >
              <span>بازگشت</span>
              <span>›</span>
            </button>
          )}
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto pb-20">
          {children}
        </main>

        {/* Bottom nav */}
        <nav className="fixed bottom-0 inset-x-0 max-w-md mx-auto z-20 bg-white border-t border-gray-200 flex">
          {NAV_TABS.map((tab) => (
            <NavLink
              key={tab.path}
              to={tab.path}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center justify-center py-2 text-xs gap-0.5 transition-colors ${
                  isActive
                    ? 'text-purple-700 font-semibold'
                    : 'text-gray-500 hover:text-gray-700'
                }`
              }
            >
              <span className="text-lg leading-none">{tab.icon}</span>
              <span>{tab.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}
