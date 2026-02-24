import multer from 'multer';

const MAX_PDF_SIZE_BYTES = Number(process.env.MAX_PDF_SIZE_BYTES || 10 * 1024 * 1024);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_PDF_SIZE_BYTES,
    files: 1,
  },
  fileFilter: (_req: unknown, file: { mimetype: string; originalname: string }, cb: multer.FileFilterCallback) => {
    const isPdfMime = file.mimetype === 'application/pdf';
    const hasPdfExtension = file.originalname.toLowerCase().endsWith('.pdf');

    if (!isPdfMime && !hasPdfExtension) {
      cb(new Error('Only PDF files are allowed.'));
      return;
    }

    cb(null, true);
  },
});

export default upload;
