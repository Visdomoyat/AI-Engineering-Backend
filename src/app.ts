import express, { Request, Response } from 'express';
import { getSupabaseClient } from './lib/supabase';
import jwtRouter from './controllers/jwt';
import authRouter from './controllers/auth';
import userRouter from './controllers/user';
import morgan from 'morgan';


export const createApp = () => {
  const app = express();

  // Global middleware
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
  // TODO: Implement PDF upload endpoint
  app.post('/api/upload-pdf', (req: Request, res: Response) => {
    // This will accept PDF files (via multipart/form-data)
    // and trigger LightRAG + Supabase ingestion.
    return res.status(501).json({ error: 'Not implemented yet' });
  });

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

