import { Router, type Request, type Response } from 'express';
import multer from 'multer';
import verifyToken from '../middleware/verify-token';
import upload from '../middleware/upload';
import { getSupabaseClient } from '../lib/supabase';
import { getErrorMessage } from '../lib/error';
import DocumentModel from '../model/document';
import { enqueueDocumentIngestion } from '../services/document-ingestion';

type AuthPayload = { payload?: { username: string; id: string } };

type UploadedFile = {
  originalname: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
};

const router = Router();

function getAuthenticatedUserId(req: Request): string | null {
  const authUser = req.user as AuthPayload | undefined;
  return authUser?.payload?.id || null;
}

function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function isPdfBuffer(fileBuffer: Buffer): boolean {
  return fileBuffer.slice(0, 4).toString() === '%PDF';
}

router.post('/', verifyToken, (req: Request, res: Response, next) => {
  upload.single('file')(req, res, (err?: unknown) => {
    if (!err) {
      next();
      return;
    }

    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        res.status(413).json({ error: 'PDF exceeds upload size limit.' });
        return;
      }

      res.status(400).json({ error: err.message });
      return;
    }

    const message = getErrorMessage(err, 'Upload failed');
    res.status(400).json({ error: message });
  });
}, async (req: Request, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const file = (req as Request & { file?: UploadedFile }).file;
    if (!file) {
      return res.status(400).json({ error: 'No PDF file uploaded. Use multipart/form-data with field name "file".' });
    }

    if (!isPdfBuffer(file.buffer)) {
      return res.status(400).json({ error: 'Uploaded file is not a valid PDF.' });
    }

    const safeName = sanitizeFilename(file.originalname || 'document.pdf') || 'document.pdf';
    const storagePath = `${userId}/${Date.now()}-${safeName}`;
    const bucket = process.env.SUPABASE_UPLOAD_BUCKET || 'Document';

    const supabase = getSupabaseClient();
    const { error: storageError } = await supabase.storage
      .from(bucket)
      .upload(storagePath, file.buffer, {
        contentType: 'application/pdf',
        upsert: false,
      });

    if (storageError) {
      return res.status(500).json({ error: storageError.message });
    }

    const savedDocument = await DocumentModel.create({
      user_id: userId,
      filename: safeName,
      storage_path: storagePath,
      size_bytes: file.size,
      status: 'uploaded',
    });

    void enqueueDocumentIngestion(savedDocument).catch(async () => {
      if (savedDocument.id) {
        await DocumentModel.updateStatus(savedDocument.id, 'failed').catch(() => undefined);
      }
    });

    return res.status(201).json({
      message: 'PDF uploaded successfully.',
      document: savedDocument,
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

    const documents = await DocumentModel.findAllByUserId(userId);
    return res.json({ documents });
  } catch (err) {
    const message = getErrorMessage(err);
    return res.status(500).json({ error: message });
  }
});

router.delete('/:documentId', verifyToken, async (req: Request, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const rawDocumentId = req.params.documentId;
    const documentId = Array.isArray(rawDocumentId) ? rawDocumentId[0] : rawDocumentId;
    if (!documentId) {
      return res.status(400).json({ error: 'Document ID is required.' });
    }
    const document = await DocumentModel.findByIdForUser(documentId, userId);
    if (!document || !document.id) {
      return res.status(404).json({ error: 'Document not found.' });
    }

    const bucket = process.env.SUPABASE_UPLOAD_BUCKET || 'documents';
    const supabase = getSupabaseClient();
    const { error: removeError } = await supabase.storage
      .from(bucket)
      .remove([document.storage_path]);

    if (removeError) {
      return res.status(500).json({ error: removeError.message });
    }

    await DocumentModel.deleteById(document.id);

    return res.json({ message: 'Document deleted successfully.' });
  } catch (err) {
    const message = getErrorMessage(err);
    return res.status(500).json({ error: message });
  }
});

export default router;
