import { checkAdmin } from './_adminAuth.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const userId = await checkAdmin(req, res);
  if (!userId) return;

  const { trackingId, message } = req.body || {};
  if (!trackingId || !message || !message.trim()) {
    return res.status(400).json({ error: 'Məlumat çatışmır' });
  }

  const token = process.env.NOTION_TOKEN;
  if (!token) return res.status(500).json({ error: 'Token tapılmadı' });

  const dbId = process.env.NOTION_DATABASE_ID;
  if (!dbId) return res.status(500).json({ error: 'Database ID tapılmadı' });

  try {
    const searchRes = await fetch(`https://api.notion.com/v1/databases/${dbId}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28'
      },
      body: JSON.stringify({
        filter: { property: 'Tracking ID', rich_text: { equals: trackingId } }
      })
    });

    const searchData = await searchRes.json();
    if (!searchData.results || searchData.results.length === 0) {
      return res.status(404).json({ error: 'Sorğu tapılmadı' });
    }

    const pageId = searchData.results[0].id;

    const commentRes = await fetch('https://api.notion.com/v1/comments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28'
      },
      body: JSON.stringify({
        parent: { page_id: pageId },
        rich_text: [{ text: { content: `[Samir]: ${message.trim()}` } }]
      })
    });

    const commentData = await commentRes.json();
    if (!commentRes.ok) {
      return res.status(500).json({ error: commentData.message || 'Comment əlavə edilmədi' });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
