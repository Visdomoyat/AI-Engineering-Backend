import { Router, type Request, type Response } from 'express';
import verifyToken from '../middleware/verify-token';
import { getErrorMessage } from '../lib/error';
import DocumentModel from '../model/document';
import { answerFromIndexedDocuments } from '../services/chat';

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

    const { message, documentIds, topK } = req.body as {
      message?: string;
      documentIds?: string[];
      topK?: number;
    };

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: 'message is required' });
    }

    let allowedDocumentIds: string[] | undefined;
    if (Array.isArray(documentIds) && documentIds.length > 0) {
      const ownedDocs = await DocumentModel.findByIdsForUser(documentIds, userId);
      const ownedDocIds = new Set(ownedDocs.map((doc) => doc.id).filter((id): id is string => !!id));
      allowedDocumentIds = documentIds.filter((id) => ownedDocIds.has(id));
    }

    const response = await answerFromIndexedDocuments({
      userId,
      message: message.trim(),
      documentIds: allowedDocumentIds,
      topK,
    });

    return res.json(response);
  } catch (err) {
    const message = getErrorMessage(err);
    return res.status(500).json({ error: message });
  }
});

export default router;
