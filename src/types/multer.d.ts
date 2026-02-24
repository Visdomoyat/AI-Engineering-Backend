declare module 'multer' {
  import { RequestHandler } from 'express';

  interface MulterFile {
    fieldname: string;
    originalname: string;
    encoding: string;
    mimetype: string;
    size: number;
    buffer: Buffer;
  }

  interface MulterError extends Error {
    code: string;
  }

  type FileFilterCallback = (error: Error | null, acceptFile?: boolean) => void;

  interface MulterInstance {
    single(fieldName: string): RequestHandler;
  }

  interface MulterOptions {
    storage?: unknown;
    limits?: {
      fileSize?: number;
      files?: number;
    };
    fileFilter?: (req: unknown, file: MulterFile, callback: FileFilterCallback) => void;
  }

  function multer(options?: MulterOptions): MulterInstance;

  namespace multer {
    function memoryStorage(): unknown;
    const MulterError: {
      new (message?: string): MulterError;
      prototype: MulterError;
    };
    type FileFilterCallback = import('multer').FileFilterCallback;
  }

  export = multer;
}
