import { Router, type Request, type Response } from 'express';
import jwt from 'jsonwebtoken';

const router = Router();

router.get('/sign-token', (req: Request, res: Response) => {
  const user = {
    _id: 1,
    username: 'test',
    password: 'test',
  };

  if (!process.env.JWT_SECRET) {
    return res.status(500).json({ error: 'JWT_SECRET is not configured' });
  }

  const token = jwt.sign({ user }, process.env.JWT_SECRET);
  res.json({ token });
});

router.post('/verify-token', (req: Request, res: Response) => {
  try {
    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ error: 'JWT_SECRET is not configured' });
    }

    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Token missing' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return res.json({ decoded });
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token.' });
  }
});

export default router;

