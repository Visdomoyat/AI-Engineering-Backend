import express, { Request, Response } from 'express';

export const createApp = () => {
  const app = express();

  // Global middleware
  app.use(express.json());

  // Basic health check
  app.get('/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', message: 'Backend is running (TypeScript)' });
  });

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

