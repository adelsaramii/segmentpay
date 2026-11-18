import { useSyncExternalStore } from 'react';

function subscribe(cb: () => void) {
  window.addEventListener('online', cb);
  window.addEventListener('offline', cb);
  return () => {
    window.removeEventListener('online', cb);
    window.removeEventListener('offline', cb);
  };
}

function getSnapshot() {
  return navigator.onLine;
}

export function OfflineBanner() {
  const isOnline = useSyncExternalStore(subscribe, getSnapshot, () => true);

  if (isOnline) return null;

  return (
    <div
      data-testid="offline-banner"
      role="status"
      className="bg-yellow-400 text-yellow-900 text-center text-sm font-semibold py-2 px-4 w-full"
    >
      در حال حاضر آفلاین هستید — پرداخت در دسترس نیست
    </div>
  );
}
