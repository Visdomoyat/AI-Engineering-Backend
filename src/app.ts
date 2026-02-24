import express, { Request, Response } from 'express';
import { getSupabaseClient } from './lib/supabase';
import jwtRouter from './controllers/jwt';
import authRouter from './controllers/auth';
import userRouter from './controllers/user';
import uploadRouter from './controllers/upload';
import morgan from 'morgan';


export const createApp = () => {
  const app = express();
  const defaultLocalOrigins = ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:5174'];
  const configuredOrigins = (process.env.FRONTEND_ORIGIN || '')
    .split(',')
    .map((origin) => origin.trim().replace(/^"|"$/g, ''))
    .filter(Boolean);
  const allowedOrigins = new Set([...defaultLocalOrigins, ...configuredOrigins]);

  // Global middleware
  app.use((req: Request, res: Response, next) => {
    const requestOrigin = req.headers.origin;

    if (requestOrigin && allowedOrigins.has(requestOrigin)) {
      res.header('Access-Control-Allow-Origin', requestOrigin);
      res.header('Vary', 'Origin');
      res.header('Access-Control-Allow-Credentials', 'true');
    }

    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.header(
      'Access-Control-Allow-Headers',
      req.headers['access-control-request-headers']?.toString() || 'Content-Type, Authorization'
    );

    if (req.method === 'OPTIONS') {
      if (requestOrigin && !allowedOrigins.has(requestOrigin)) {
        return res.status(403).json({ error: 'CORS origin not allowed' });
      }
      return res.sendStatus(204);
    }

    next();
  });
  app.use(express.json());
  app.use(morgan('dev'));
  // Basic health check
  app.get('/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', message: 'Backend is running (TypeScript)' });
  });

  // Supabase connectivity check (verifies env + can reach Supabase)
  app.get('/api/supabase/health', async (req: Request, res: Response) => {
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase.storage.listBuckets();
      if (error) return res.status(500).json({ ok: false, error: error.message });
      return res.json({ ok: true, buckets: data.map((b) => b.name) });
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Unknown error';
      return res.status(500).json({ ok: false, error: message });
    }
  });

  app.use('/api/jwt', jwtRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/users', userRouter);
  app.use('/api/upload-pdf', uploadRouter);

  // TODO: Implement chat endpoint
  app.post('/api/chat', (req: Request, res: Response) => {
    // This will:
    // 1. Take a user message
    // 2. Retrieve relevant context from LightRAG / Supabase
    // 3. Call the LLM (Grok 4.1) with that context
    // 4. Return the model response
    return res.status(501).json({ error: 'Not implemented yet' });
  });

  // TODO: Implement handbook generation endpoint
  app.post('/api/handbook', (req: Request, res: Response) => {
    // This will orchestrate the LongWriter-style multi-step
    // generation of a 20,000+ word handbook.
    return res.status(501).json({ error: 'Not implemented yet' });
  });

  return app;
};
