import express from 'express';
import cors from 'cors';
import { createRouter } from './http/routes.js';

export function createApp() {
  const app = express();

  app.use(cors({ origin: '*' }));
  app.use(express.json());

  app.use('/api', createRouter());

  return app;
}

const port = process.env.PORT ?? 4000;

// Only listen if this is the entry point (not imported by tests)
if (process.argv[1] && (process.argv[1].endsWith('server.ts') || process.argv[1].endsWith('server.js'))) {
  const app = createApp();
  app.listen(port, () => {
    console.log(`SegmentPay API listening on http://localhost:${port}`);
  });
}
