import { useSyncExternalStore } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff } from 'lucide-react';

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

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          data-testid="offline-banner"
          role="status"
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -40, opacity: 0 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          className="fixed top-0 inset-x-0 z-50 flex items-center justify-center gap-2 bg-warning text-black text-sm font-semibold py-2 px-4"
        >
          <WifiOff size={16} strokeWidth={2.5} />
          <span>آفلاین هستید — پرداخت در دسترس نیست</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
