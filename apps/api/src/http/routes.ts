import { Router, Request, Response, NextFunction } from 'express';
import type { CartItemInput, PayRequest, RefundRequest } from '@segmentpay/shared';
import { getState, resetState } from '../domain/state.js';
import { computeWalletView } from '../domain/ledger.js';
import { createOrder, getOrder, listOrders } from '../domain/orders.js';
import { evaluateEligibility } from '../domain/eligibility.js';
import { payOrder, refundOrder } from '../domain/payments.js';
import { jiraTickets, jiraProject } from './jira.js';

export function createRouter(): Router {
  const router = Router();

  // GET /api/wallet
  router.get('/wallet', (_req: Request, res: Response) => {
    const state = getState();
    const view = computeWalletView(state);
    res.json(view);
  });

  // GET /api/products
  router.get('/products', (_req: Request, res: Response) => {
    const state = getState();
    res.json(Array.from(state.products.values()));
  });

  // POST /api/orders
  router.post('/orders', (req: Request, res: Response, next: NextFunction) => {
    try {
      const items = req.body.items as CartItemInput[];
      const order = createOrder(items);
      res.status(201).json(order);
    } catch (err) {
      next(err);
    }
  });

  // GET /api/orders
  router.get('/orders', (_req: Request, res: Response) => {
    res.json(listOrders());
  });

  // GET /api/orders/:id
  router.get('/orders/:id', (req: Request, res: Response, next: NextFunction) => {
    const order = getOrder(req.params.id);
    if (!order) {
      return next({ code: 'NOT_FOUND', message: 'Order not found', messageFa: 'سفارش یافت نشد', status: 404 });
    }
    res.json(order);
  });

  // POST /api/orders/:id/quote
  router.post('/orders/:id/quote', (req: Request, res: Response, next: NextFunction) => {
    const order = getOrder(req.params.id);
    if (!order) {
      return next({ code: 'NOT_FOUND', message: 'Order not found', messageFa: 'سفارش یافت نشد', status: 404 });
    }
    const state = getState();
    const eligibility = evaluateEligibility(order, state);
    res.json({ orderId: order.id, totalCents: order.totalCents, eligibility });
  });

  // POST /api/orders/:id/pay
  router.post('/orders/:id/pay', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = req.body as PayRequest;
      if (!body.idempotencyKey) {
        return next({
          code: 'MISSING_IDEMPOTENCY_KEY',
          message: 'idempotencyKey is required',
          messageFa: 'کلید بی‌قراردادی الزامی است',
          status: 400,
        });
      }
      const result = await payOrder(req.params.id, body);
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  // POST /api/orders/:id/refund
  router.post('/orders/:id/refund', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = req.body as RefundRequest;
      if (!body.idempotencyKey) {
        return next({
          code: 'MISSING_IDEMPOTENCY_KEY',
          message: 'idempotencyKey is required',
          messageFa: 'کلید بی‌قراردادی الزامی است',
          status: 400,
        });
      }
      const result = await refundOrder(req.params.id, body);
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  // GET /api/ledger
  router.get('/ledger', (_req: Request, res: Response) => {
    const state = getState();
    const sorted = [...state.ledger].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    res.json(sorted);
  });

  // GET /api/jira/tickets
  router.get('/jira/tickets', (_req: Request, res: Response) => {
    res.json({ project: jiraProject, tickets: jiraTickets });
  });

  // GET /api/jira/tickets/:key
  router.get('/jira/tickets/:key', (req: Request, res: Response, next: NextFunction) => {
    const ticket = jiraTickets.find((t) => t.key === req.params.key);
    if (!ticket) {
      return next({ code: 'NOT_FOUND', message: 'Ticket not found', messageFa: 'تیکت یافت نشد', status: 404 });
    }
    res.json(ticket);
  });

  // POST /api/dev/reset
  router.post('/dev/reset', (_req: Request, res: Response) => {
    resetState();
    res.json({ ok: true, message: 'State reset to seed' });
  });

  // GET /api/dev/gateway
  router.get('/dev/gateway', (_req: Request, res: Response) => {
    res.json({ gatewayMode: getState().gatewayMode });
  });

  // POST /api/dev/gateway
  router.post('/dev/gateway', (req: Request, res: Response, next: NextFunction) => {
    const { mode } = req.body as { mode: string };
    const valid = ['success', 'card_declined', 'network_error'];
    if (!valid.includes(mode)) {
      return next({
        code: 'INVALID_GATEWAY_MODE',
        message: `Mode must be one of: ${valid.join(', ')}`,
        messageFa: 'حالت درگاه نامعتبر است',
        status: 400,
      });
    }
    getState().gatewayMode = mode as 'success' | 'card_declined' | 'network_error';
    res.json({ ok: true, gatewayMode: mode });
  });

  // Error handler
  router.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const e = err as {
      code?: string;
      message?: string;
      messageFa?: string;
      details?: Record<string, unknown>;
      status?: number;
    };

    const code = e.code ?? 'INTERNAL_ERROR';
    const message = e.message ?? 'An unexpected error occurred';
    const messageFa = e.messageFa ?? 'خطای غیرمنتظره‌ای رخ داد';
    const details = e.details;

    let status = e.status ?? 500;
    if (code === 'NOT_FOUND') status = 404;
    else if (
      code === 'ORDER_ALREADY_PAID' ||
      code === 'IDEMPOTENCY_CONFLICT' ||
      code === 'NOT_REFUNDABLE'
    )
      status = 409;
    else if (
      code === 'ALLOCATION_MISMATCH' ||
      code === 'INELIGIBLE_SEGMENT' ||
      code === 'INSUFFICIENT_SEGMENT_BALANCE' ||
      code === 'EMPTY_CART' ||
      code === 'INVALID_AMOUNT' ||
      code === 'MISSING_IDEMPOTENCY_KEY'
    )
      status = 400;

    res.status(status).json({ error: { code, message, messageFa, ...(details ? { details } : {}) } });
  });

  return router;
}
