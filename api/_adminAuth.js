import { getAuthUserId } from './_clerk.js';

export async function checkAdmin(req, res) {
  const userId = await getAuthUserId(req);
  if (!userId) {
    res.status(401).json({ error: 'Giriş tələb olunur' });
    return null;
  }
  const adminIds = (process.env.ADMIN_USER_IDS || '')
    .split(',').map(s => s.trim()).filter(Boolean);
  if (adminIds.length > 0 && !adminIds.includes(userId)) {
    res.status(403).json({ error: 'İcazəniz yoxdur' });
    return null;
  }
  return userId;
}
