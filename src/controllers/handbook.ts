import { Router, type Request, type Response } from 'express';
import verifyToken from '../middleware/verify-token';
import { getErrorMessage } from '../lib/error';
import HandbookModel from '../model/handbook';
import { startHandbookGeneration } from '../services/handbook';

type AuthPayload = { payload?: { username: string; id: string } };

function getAuthenticatedUserId(req: Request): string | null {
  const authUser = req.user as AuthPayload | undefined;
  return authUser?.payload?.id || null;
}

const router = Router();

router.post('/', verifyToken, async (req: Request, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { prompt, title, documentIds, targetWords } = req.body as {
      prompt?: string;
      title?: string;
      documentIds?: string[];
      targetWords?: number;
    };

    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return res.status(400).json({ error: 'prompt is required' });
    }

    const handbook = await startHandbookGeneration({
      userId,
      prompt,
      title,
      documentIds: Array.isArray(documentIds) ? documentIds : undefined,
      targetWords: typeof targetWords === 'number' ? targetWords : undefined,
    });

    return res.status(202).json({
      message: 'Handbook generation started.',
      handbook,
    });
  } catch (err) {
    const message = getErrorMessage(err);
    return res.status(500).json({ error: message });
  }
});

router.get('/', verifyToken, async (req: Request, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const handbooks = await HandbookModel.findAllByUserId(userId);
    return res.json({ handbooks });
  } catch (err) {
    const message = getErrorMessage(err);
    return res.status(500).json({ error: message });
  }
});

router.get('/:handbookId', verifyToken, async (req: Request, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const rawId = req.params.handbookId;
    const handbookId = Array.isArray(rawId) ? rawId[0] : rawId;
    if (!handbookId) {
      return res.status(400).json({ error: 'handbookId is required' });
    }

    const handbook = await HandbookModel.findByIdForUser(handbookId, userId);
    if (!handbook) {
      return res.status(404).json({ error: 'Handbook not found' });
    }

    return res.json({ handbook });
  } catch (err) {
    const message = getErrorMessage(err);
    return res.status(500).json({ error: message });
  }
});

export default router;
