import { Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from './components/AppShell.js';
import { OfflineBanner } from './components/OfflineBanner.js';
import { WalletPage } from './pages/WalletPage.js';
import { ShopPage } from './pages/ShopPage.js';
import { CartPage } from './pages/CartPage.js';
import { CheckoutPage } from './pages/CheckoutPage.js';
import { PaymentResultPage } from './pages/PaymentResultPage.js';
import { OrderHistoryPage } from './pages/OrderHistoryPage.js';
import { OrderDetailPage } from './pages/OrderDetailPage.js';
import { LedgerPage } from './pages/LedgerPage.js';
import { JiraBoardPage } from './pages/JiraBoardPage.js';

export function App() {
  return (
    <>
      <OfflineBanner />
      <AppShell>
        <Routes>
          <Route path="/" element={<Navigate to="/wallet" replace />} />
          <Route path="/wallet" element={<WalletPage />} />
          <Route path="/shop" element={<ShopPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout/:orderId" element={<CheckoutPage />} />
          <Route path="/payment-result/:orderId" element={<PaymentResultPage />} />
          <Route path="/orders" element={<OrderHistoryPage />} />
          <Route path="/orders/:orderId" element={<OrderDetailPage />} />
          <Route path="/ledger" element={<LedgerPage />} />
          <Route path="/jira" element={<JiraBoardPage />} />
          <Route path="*" element={<Navigate to="/wallet" replace />} />
        </Routes>
      </AppShell>
    </>
  );
}
