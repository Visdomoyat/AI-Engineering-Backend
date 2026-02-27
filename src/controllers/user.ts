import { Router, type Request, type Response } from 'express';
import { getErrorMessage } from '../lib/error';
import UserModel, { toPublicUser } from '../model/user';
import verifyToken from '../middleware/verify-token';

const router = Router();

// JWT payload shape from auth (payload: { username, id })
type AuthPayload = { payload?: { username: string; id: string } };

router.get('/', verifyToken, async (req: Request, res: Response) => {
  try {
    const users = await UserModel.findAll(['id', 'username']);
    return res.json(users);
  } catch (err) {
    const message = getErrorMessage(err);
    return res.status(500).json({ error: message });
  }
});

router.get('/:userId', verifyToken, async (req: Request, res: Response) => {
  try {
    const authUser = req.user as AuthPayload;
    const requestedId = req.params.userId;

    if (authUser?.payload?.id !== requestedId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const user = await UserModel.findById(requestedId);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    return res.json({ user: toPublicUser(user) });
  } catch (err) {
    const message = getErrorMessage(err);
    return res.status(500).json({ error: message });
  }
});

export default router;
