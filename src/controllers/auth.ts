import { Router, type Request, type Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import UserModel from '../model/user';

const router = Router();
const saltRounds = 12;

router.post('/sign-up', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required.' });
    }

    const userInDatabase = await UserModel.findByUsername(username);
    if (userInDatabase) {
      return res.status(409).json({ error: 'Username already taken.' });
    }

    const user = await UserModel.create({
      username,
      hashed_password: bcrypt.hashSync(password, saltRounds),
    });

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return res.status(500).json({ error: 'JWT_SECRET is not configured' });
    }

    const payload = { username: user.username, id: user.id };
    const token = jwt.sign({ payload }, secret);

    return res.status(201).json({ token });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return res.status(500).json({ error: message });
  }
});

router.post('/sign-in', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required.' });
    }

    const user = await UserModel.findByUsername(username);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const isPasswordCorrect = bcrypt.compareSync(password, user.hashed_password);
    if (!isPasswordCorrect) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return res.status(500).json({ error: 'JWT_SECRET is not configured' });
    }

    const payload = { username: user.username, id: user.id };
    const token = jwt.sign({ payload }, secret);

    return res.status(200).json({ token });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return res.status(500).json({ error: message });
  }
});

export default router;