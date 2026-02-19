import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';

declare global {
  namespace Express {
    interface Request {
      user?: jwt.JwtPayload;
    }
  }
}

function verifyToken(req: Request, res: Response, next: NextFunction): void {
  try {
    if (!req.headers.authorization) {
      res.status(401).json({ err: 'No token provided' });
      return;
    }

    const token = req.headers.authorization.split(' ')[1];
    if (!token) {
      res.status(401).json({ err: 'Token missing' });
      return;
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      res.status(500).json({ err: 'JWT_SECRET is not configured' });
      return;
    }

    const decoded = jwt.verify(token, secret);
    req.user = decoded as jwt.JwtPayload;

    next();
  } catch (err) {
    res.status(401).json({ err: 'Invalid or expired token' });
  }
}

export default verifyToken;